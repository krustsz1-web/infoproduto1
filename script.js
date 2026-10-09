const $=s=>document.querySelector(s);


/* Google Analytics 4: eventos anônimos, sem enviar dados pessoais do formulário. */
(function initMaeAnalytics(){
  function track(name, extra={}) {
    if(typeof window.gtag !== "function") return;
    window.gtag("event", name, {page_location: location.href.split("?")[0], ...extra});
  }
  window.__maeAnalytics={track:(name)=>{if(["triage_start","triage_submit","whatsapp_click","cta_click"].includes(name))track(name);}};
  document.addEventListener("click", event=>{
    const target=event.target instanceof Element?event.target.closest("a,button"):null;
    if(!target)return;
    if(target.matches('a[href^="https://wa.me/"]')) track("whatsapp_click");
    else if(target.matches('a[href="#triagem"], #leadForm button[type="submit"]')) track("cta_click");
  },true);
  const form=document.querySelector("#leadForm");
  if(form) form.addEventListener("focusin",()=>{
    if(!form.dataset.analyticsStarted){form.dataset.analyticsStarted="1";track("triage_start");}
  });
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
