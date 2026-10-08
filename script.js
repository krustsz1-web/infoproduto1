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

$("#leadForm").onsubmit=e=>{
  e.preventDefault();
  const form=e.currentTarget;
  if(!form.reportValidity())return;

  const data=collectLead(form);
  const old=$("#triagemResult");
  if(old)old.remove();

  /*
   * O número de WhatsApp do atendimento será configurado quando definido.
   * Por enquanto, a triagem fica pronta no navegador e a página confirma
   * o recebimento sem expor nenhum contato fictício.
   */
  const x=document.createElement("div");
  x.id="triagemResult";
  x.className="triagem-result qualified";
  x.innerHTML="<strong>Triagem preenchida com sucesso.</strong><p>Recebemos suas informações iniciais. Em breve você poderá receber o contato para orientação sobre os próximos passos.</p><p class='micro'>As informações deste formulário são usadas para a análise inicial do seu caso.</p>";
  form.after(x);
  x.scrollIntoView({behavior:"smooth",block:"center"});
};

document.querySelectorAll('a[href="#triagem"]').forEach(a=>{
  a.addEventListener("click",()=>{
    setTimeout(()=>$("#triagem")?.scrollIntoView({behavior:"smooth",block:"start"}),0);
  });
});
