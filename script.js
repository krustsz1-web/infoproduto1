const $=s=>document.querySelector(s);


/* Mãe Analytics: coleta anônima, sem nomes, telefones, respostas ou conteúdo de formulário. */
(function initMaeAnalytics(){
  const SITE_ORIGIN="https://maecomdireito.vercel.app";
  const allowedReferrers=new Set(["google.com","www.google.com","bing.com","www.bing.com","instagram.com","www.instagram.com","facebook.com","www.facebook.com","t.co","youtube.com","www.youtube.com","maecomdireito.vercel.app"]);
  const validSources=new Set(["direct","organic","google","bing","instagram","facebook","whatsapp","youtube","referral","email","other"]);
  const validMediums=new Set(["organic","referral","social","cpc","paid_social","email","none","other"]);
  const now=Date.now();
  const readSession=()=>{
    try{
      const current=JSON.parse(sessionStorage.getItem("mcd_analytics_session")||"null");
      if(current && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(current.id)
        && now-current.started<86400000 && now-current.lastActivity<1800000) return current;
    }catch(_){}
    const fresh={id:crypto.randomUUID(),started:now,lastActivity:now};
    try{sessionStorage.setItem("mcd_analytics_session",JSON.stringify(fresh));}catch(_){}
    return fresh;
  };
  let session=readSession();
  let triageStarted=false;
  const touch=()=>{
    const time=Date.now();
    if(time-session.started>=86400000 || time-session.lastActivity>=1800000){
      session={id:crypto.randomUUID(),started:time,lastActivity:time};
      try{sessionStorage.setItem("mcd_analytics_session",JSON.stringify(session));}catch(_){}
      send("page_view");
    }
    session.lastActivity=time;
    try{sessionStorage.setItem("mcd_analytics_session",JSON.stringify(session));}catch(_){}
  };
  const categoryPage=()=>location.hash==="#triagem"?"/triagem":"/";
  const device=()=>{
    const ua=navigator.userAgent||"";
    if(/iPad|Tablet/i.test(ua))return "tablet";
    if(/Mobi|Android|iPhone|iPod/i.test(ua))return "mobile";
    return "desktop";
  };
  const browser=()=>{
    const ua=navigator.userAgent||"";
    if(/Edg\//.test(ua))return "edge";
    if(/Firefox\//.test(ua))return "firefox";
    if(/CriOS|Chrome\//.test(ua) && !/Edg\//.test(ua))return "chrome";
    if(/Safari\//.test(ua) && !/Chrome|CriOS|Edg\//.test(ua))return "safari";
    return "other";
  };
  const sourceInfo=()=>{
    let ref=null;
    try{
      if(document.referrer){
        const host=new URL(document.referrer).hostname.toLowerCase();
        ref=allowedReferrers.has(host)?host:"other";
      }
    }catch(_){}
    const params=new URLSearchParams(location.search);
    const rawSource=(params.get("utm_source")||"").toLowerCase();
    const rawMedium=(params.get("utm_medium")||"").toLowerCase();
    const sourceMap={
      fb:"facebook",facebook:"facebook",meta:"facebook",instagram:"instagram",
      google:"google",adwords:"google",bing:"bing",whatsapp:"whatsapp",
      youtube:"youtube",email:"email",newsletter:"email"
    };
    const mediumMap={
      organic:"organic",referral:"referral",social:"social",cpc:"cpc",
      ppc:"cpc",paid:"cpc",paid_social:"paid_social",paidsocial:"paid_social",
      email:"email",none:"none"
    };
    let source=sourceMap[rawSource]||null;
    let medium=mediumMap[rawMedium]||null;
    if(!source){
      if(ref==="google.com"||ref==="www.google.com")source="google";
      else if(ref==="bing.com"||ref==="www.bing.com")source="bing";
      else if(ref==="instagram.com"||ref==="www.instagram.com")source="instagram";
      else if(ref==="facebook.com"||ref==="www.facebook.com")source="facebook";
      else if(ref==="youtube.com"||ref==="www.youtube.com")source="youtube";
      else if(ref==="maecomdireito.vercel.app")source="direct";
      else source=ref?"referral":"direct";
    }
    if(!medium){
      if(source==="google"||source==="bing")medium=ref?"organic":"none";
      else if(["facebook","instagram","youtube","whatsapp"].includes(source))medium=ref?"social":"none";
      else if(source==="referral")medium="referral";
      else if(source==="email")medium="email";
      else medium="none";
    }
    return {
      referrer_host:ref,
      source:validSources.has(source)?source:"other",
      medium:validMediums.has(medium)?medium:"other"
    };
  };
  let lastWhatsAppEvent=0;
  function send(eventName){
    if(eventName==="whatsapp_click"){
      const eventTime=Date.now();
      if(eventTime-lastWhatsAppEvent<2000)return;
      lastWhatsAppEvent=eventTime;
    }
    touch();
    const attribution=sourceInfo();
    const payload={
      session_id:session.id,
      event_id:crypto.randomUUID(),
      event_name:eventName,
      page_path:categoryPage(),
      occurred_at:new Date().toISOString(),
      referrer_host:attribution.referrer_host,
      source:attribution.source,
      medium:attribution.medium,
      device_type:device(),
      browser:browser()
    };
    let body;
    try{body=JSON.stringify(payload);}catch(_){return;}
    try{
      fetch("/api/analytics",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body,
        credentials:"same-origin",
        keepalive:true
      }).catch(()=>{});
    }catch(_){}
  }
  window.__maeAnalytics={track:(name)=>{if(["triage_start","triage_submit","whatsapp_click","cta_click"].includes(name))send(name);}};
  send("page_view");
  let heartbeatTimer=null;
  const startHeartbeat=()=>{
    if(heartbeatTimer!==null)return;
    heartbeatTimer=window.setInterval(()=>{if(document.visibilityState==="visible")send("heartbeat");},30000);
  };
  const stopHeartbeat=()=>{
    if(heartbeatTimer!==null){clearInterval(heartbeatTimer);heartbeatTimer=null;}
  };
  document.addEventListener("visibilitychange",()=>{
    if(document.visibilityState==="visible"){send("heartbeat");startHeartbeat();}
    else stopHeartbeat();
  });
  startHeartbeat();
  window.addEventListener("hashchange",()=>send("page_view"));
  document.addEventListener("click",event=>{
    const target=event.target instanceof Element?event.target.closest("a,button"):null;
    if(!target)return;
    if(target.matches('a[href="#triagem"], a[href^="https://wa.me/"]')) {
      if(target.matches('a[href^="https://wa.me/"]'))send("whatsapp_click");
      else send("cta_click");
    }else if(target.matches("#leadForm button[type='submit']"))send("cta_click");
  },true);
  const form=document.querySelector("#leadForm");
  if(form)form.addEventListener("focusin",()=>{
    if(!triageStarted){triageStarted=true;send("triage_start");}
  },{once:false});
})();


function toast(msg){
  const x=$("#toast");
  if(!x)return;
  x.textContent=msg;
  x.classList.add("show");
  clearTimeout(window.__t);
  window.__t=setTimeout(()=>x.classList.remove("show"),2800);
}

function formatWhatsApp(value){
  return String(value||"").replace(/\D/g,"");
}

function collectLead(form){
  const data=Object.fromEntries(new FormData(form).entries());
  if(data.nao_sei_data==="sim") data.data="Não sei informar";
  delete data.nao_sei_data;
  return data;
}

function qualifiesLead(data){
  if(data.fase==="Já tive o bebê" && data.data && data.data!=="Não sei informar"){
    const birthDate=new Date(data.data+"T00:00:00");
    const limitDate=new Date(birthDate);
    limitDate.setFullYear(limitDate.getFullYear()+5);
    if(limitDate < new Date()) return false;
  }

  if(data.vinculo==="Não") return false;

  if(data.trabalho==="Estou desempregada"){
    if(data.ultima_contribuicao==="Mais de 36 meses") return false;
  }

  if(data.trabalho==="Outra / não sei") return false;
  return true;
}

function leadMessage(data){
  return [
    "Olá! Quero verificar meu possível direito ao salário-maternidade.",
    "",
    "*Nome:* "+data.nome,
    "*Situação:* "+data.fase,
    "*Categoria:* "+data.trabalho,
    "*Já teve vínculo/contribuição ao INSS:* "+data.vinculo,
    "*Última contribuição:* "+(data.ultima_contribuicao||"Não informado"),
    "*Já pediu ao INSS:* "+data.pedido,
    "*Parto/nascimento:* "+(data.data||"Não informado"),
    "*WhatsApp:* "+data.whatsapp
  ].join("\n");
}

const dateInput=$('input[name="data"]');
const dateOption=$('input[name="nao_sei_data"]');

if(dateInput && dateOption){
  dateOption.addEventListener("change",()=>{
    if(dateOption.checked){
      dateInput.value="";
      dateInput.disabled=true;
      dateInput.removeAttribute("required");
    }else{
      dateInput.disabled=false;
    }
  });
}

$("#leadForm").onsubmit=e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(!form.reportValidity())return;

  const data=collectLead(form);
  const old=$("#triagemResult");
  if(old)old.remove();

  const x=document.createElement("div");
  x.id="triagemResult";
  x.className="triagem-result qualified";

  if(!qualifiesLead(data)){
    x.innerHTML="<strong>Precisamos de mais informações para avaliar o seu caso.</strong><p>Com as respostas informadas, ainda não foi possível identificar com segurança se você pode ter direito ao salário-maternidade.</p><p>Isso não significa que você não tenha direito. Alguns casos dependem da análise do histórico de contribuições, vínculos com o INSS e demais informações previdenciárias.</p>";
    form.after(x);
    x.scrollIntoView({behavior:"smooth",block:"center"});
    return;
  }

  // Registra apenas a conclusão da triagem, nunca as respostas ou dados pessoais.
  window.__maeAnalytics?.track("triage_submit");
  if(typeof window.fbq === "function") { window.fbq("track","Lead"); window.fbq("track","Subscribe"); }

  const message=leadMessage(data);
  const whatsappUrl="https://wa.me/5518981073779?text="+encodeURIComponent(message);
  x.innerHTML="<strong>Seu caso passou pela triagem inicial.</strong><p>Estamos abrindo o WhatsApp com as informações da sua triagem.</p><p><a class='btn btn-primary' href='"+whatsappUrl+"' target='_blank' rel='noopener'>Continuar no WhatsApp →</a></p><p class='micro'>A triagem inicial não substitui a análise jurídica completa.</p>";
  form.after(x);
  x.scrollIntoView({behavior:"smooth",block:"center"});
  setTimeout(()=>{ window.__maeAnalytics?.track("whatsapp_click"); window.location.href=whatsappUrl; },350);
};

document.querySelectorAll('a[href="#triagem"]').forEach(a=>{
  a.addEventListener("click",()=>{
    setTimeout(()=>$("#triagem")?.scrollIntoView({behavior:"smooth",block:"start"}),0);
  });
});
