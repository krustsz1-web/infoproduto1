const $=s=>document.querySelector(s);

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
  if(data.vinculo!=="Sim") return false;
  if(data.trabalho==="Estou desempregada"){
    return data.ultima_contribuicao==="Menos de 12 meses";
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
    x.innerHTML="<strong>Precisamos de mais informações antes de encaminhar seu caso.</strong><p>Pelas respostas fornecidas, não foi possível identificar neste momento uma situação suficientemente clara para encaminhamento ao atendimento. Isso não significa, necessariamente, que você não tenha direito.</p><p class='micro'>A análise definitiva depende do histórico previdenciário e dos documentos do caso.</p>";
    form.after(x);
    x.scrollIntoView({behavior:"smooth",block:"center"});
    return;
  }

  const message=leadMessage(data);
  const whatsappUrl="https://wa.me/5518981073779?text="+encodeURIComponent(message);
  x.innerHTML="<strong>Seu caso passou pela triagem inicial.</strong><p>As respostas indicam uma situação compatível com possível direito ao salário-maternidade. Clique abaixo para enviar os dados pelo WhatsApp.</p><p><a class='btn btn-primary' href='"+whatsappUrl+"' target='_blank' rel='noopener'>Enviar pelo WhatsApp →</a></p><p class='micro'>A triagem inicial não substitui a análise jurídica completa.</p>";
  form.after(x);
  x.scrollIntoView({behavior:"smooth",block:"center"});
};

document.querySelectorAll('a[href="#triagem"]').forEach(a=>{
  a.addEventListener("click",()=>{
    setTimeout(()=>$("#triagem")?.scrollIntoView({behavior:"smooth",block:"start"}),0);
  });
});
