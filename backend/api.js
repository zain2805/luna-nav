const SOURCES = [
  {name:'NASA Planetary Data System — Geosciences Node',url:'https://pds-geosciences.wustl.edu/',description:'Planetary surface and geoscience data archives.'},
  {name:'NASA Planetary Data System',url:'https://pds.nasa.gov/',description:'Official archive catalogue and mission data products.'},
  {name:'Lunar Orbiter Laser Altimeter (LOLA)',url:'https://pgda.gsfc.nasa.gov/products/78',description:'Lunar topography products; check product documentation and resolution.'},
  {name:'NASA Moon Trek',url:'https://trek.nasa.gov/moon/',description:'Interactive lunar mapping and exploration portal.'},
  {name:'LROC QuickMap',url:'https://quickmap.lroc.asu.edu/',description:'Lunar Reconnaissance Orbiter Camera imagery and derived layers.'},
  {name:'NASA/JPL Horizons API',url:'https://ssd-api.jpl.nasa.gov/doc/horizons.html',description:'Solar-system ephemeris and observer geometry service.'},
  {name:'NAIF SPICE Generic Kernels',url:'https://naif.jpl.nasa.gov/naif/data_generic.html',description:'SPICE kernels needed for accurate body and surface geometry.'},
  {name:'NASA SPICE Toolkit',url:'https://naif.jpl.nasa.gov/naif/toolkit.html',description:'SPICE toolkit documentation and software.'}
];
const json = (res, status, data) => { res.status(status).json(data); };
const methodNotAllowed = (res, method) => json(res, 405, {error:`Method ${method} not allowed`});
const validDate = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
function getBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  return {};
}
async function nasaHorizons(query) {
  const {start, stop, step='1h'} = query;
  if (!validDate(start) || !validDate(stop) || stop <= start) return {status:400, body:{error:'Provide valid dates; stop must be later than start.'}};
  if (!['1h','6h','12h','1d'].includes(step)) return {status:400, body:{error:'Unsupported step size.'}};
  const q = new URLSearchParams({format:'json',COMMAND:"'301'",CENTER:"'500@399'",MAKE_EPHEM:"'YES'",EPHEM_TYPE:"'OBSERVER'",START_TIME:`'${start}'`,STOP_TIME:`'${stop}'`,STEP_SIZE:`'${step}'`,QUANTITIES:"'1,2,4'",CSV_FORMAT:"'YES'",OBJ_DATA:"'YES'"});
  try {
    const r = await fetch('https://ssd.jpl.nasa.gov/api/horizons.api?'+q, {signal:AbortSignal.timeout(30000)});
    const d = await r.json();
    if (!r.ok || d.error) return {status:502,body:{error:d.error || `Horizons HTTP ${r.status}`}};
    return {status:200,body:{source:'NASA/JPL Horizons API',sourceUrl:'https://ssd-api.jpl.nasa.gov/doc/horizons.html',target:'Moon (301)',observer:'Earth geocentre (500@399)',coordinateScope:'Geocentric; not a lunar surface observer',start,stop,step,result:d.result,signature:d.signature}};
  } catch (e) { return {status:502,body:{error:'NASA/JPL Horizons request failed: '+e.message}}; }
}
async function aiChat(body, forceGemini=false) {
  const openaiKey=process.env.OPENAI_API_KEY || '';
  const geminiKey=process.env.GEMINI_API_KEY || '';
  const useOpenAI=!forceGemini && !!openaiKey;
  if (!openaiKey && !geminiKey) return {status:503,body:{error:'No AI provider configured. Add OPENAI_API_KEY or GEMINI_API_KEY in Vercel Project Settings → Environment Variables.'}};
  const message=String(body.message || '').trim();
  if (!message || message.length > 5000) return {status:400,body:{error:'Question must contain 1–5000 characters.'}};
  const s=body.site && typeof body.site==='object' ? body.site : null;
  const context=s ? `Selected candidate reference: ${String(s.name||'').slice(0,120)}; approximate latitude ${Number(s.latitude)}, longitude ${Number(s.longitude)}. Profile: ${String(s.profile||'').slice(0,500)}.` : 'No candidate site selected.';
  const prompt=`You are a careful lunar south-pole mission research assistant. Distinguish established facts, assumptions and unknowns. Never fabricate NASA measurements, terrain values, coordinates, illumination duration, Earth visibility or safety scores. Candidate coordinates are approximate references, not verified landing coordinates. Explain when local SPICE kernels, high-resolution elevation data, slope/roughness products or mission constraints are needed. Do not provide flight certification or a final landing recommendation.\n${context}\nMission date: ${String(body.missionDate||'not specified').slice(0,30)}\nQuestion: ${message}`;
  try {
    if (useOpenAI) {
      const model=process.env.OPENAI_MODEL || 'gpt-4.1-mini';
      const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${openaiKey}`},body:JSON.stringify({model,instructions:'You are a careful lunar south-pole mission research assistant. Be factual, transparent and cautious. Distinguish verified facts from assumptions. Never invent NASA measurements or certify a landing site.',input:prompt,max_output_tokens:1200,store:false}),signal:AbortSignal.timeout(45000)});
      const d=await r.json();
      if (!r.ok) return {status:502,body:{error:d.error?.message || `OpenAI HTTP ${r.status}`}};
      const answer=typeof d.output_text==='string' ? d.output_text : (d.output||[]).flatMap(x=>x.content||[]).map(x=>x.text||'').filter(Boolean).join('\n').trim();
      if (!answer) return {status:502,body:{error:'OpenAI returned no readable text.'}};
      return {status:200,body:{provider:'openai',model,text:answer}};
    }
    const model=process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const r=await fetch('https://generativelanguage.googleapis.com/v1beta/interactions',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':geminiKey},body:JSON.stringify({model,input:prompt,system_instruction:'You are a careful lunar south-pole mission research assistant. Be factual, transparent and cautious.',store:false,generation_config:{temperature:0.25,max_output_tokens:1200}}),signal:AbortSignal.timeout(45000)});
    const d=await r.json();
    if (!r.ok) return {status:502,body:{error:d.error?.message || `Gemini HTTP ${r.status}`}};
    let answer=typeof d.output_text==='string' ? d.output_text.trim() : '';
    if (!answer) answer=(d.outputs||[]).flatMap(x=>typeof x.text==='string'?[x.text]:(x.content||[]).map(p=>p.text||'')).join('\n').trim();
    if (!answer) answer=(d.steps||[]).filter(x=>x.type==='model_output'||x.type==='message').flatMap(x=>x.content||[]).map(x=>x.text||'').filter(Boolean).join('\n').trim();
    if (!answer) return {status:502,body:{error:'Gemini returned no readable text. Check the selected model and API response.'}};
    return {status:200,body:{provider:'gemini',model,text:answer}};
  } catch(e) { return {status:502,body:{error:'AI request failed: '+e.message}}; }
}
module.exports={SOURCES,json,methodNotAllowed,nasaHorizons,aiChat};
