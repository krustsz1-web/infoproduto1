document.getElementById("leadForm").addEventListener("submit",function(e){
e.preventDefault();
const d=new FormData(this);
const trabalho=d.get("trabalho")||"";
const vinculo=d.get("vinculo")||"";
const ultima=d.get("ultima_contribuicao")||"";
const pedido=d.get("pedido")||"";
const data=d.get("nao_sei_data")?"":(d.get("data")||"");

let desqualificado=false;
if(vinculo==="Não" && trabalho!=="Trabalho com carteira assinada" && trabalho!=="Trabalho como empregada doméstica" && trabalho!=="Sou trabalhadora rural") desqualificado=true;
if(ultima==="Mais de 36 meses" && (trabalho==="Estou desempregada" || trabalho==="Sou autônoma" || trabalho==="Sou MEI")) desqualificado=true;
if(pedido==="Sim, foi aprovado") desqualificado=true;

if(data){
  const nascimento=new Date(data+"T00:00:00");
  const limite=new Date();
  limite.setFullYear(limite.getFullYear()-5);
  if(nascimento<limite && d.get("fase")==="Já tive o bebê") desqualificado=true;
}

const form=this;
const existing=document.getElementById("triagemResult");
if(existing) existing.remove();

const result=document.createElement("div");
result.id="triagemResult";
result.className="triagem-result "+(desqualificado?"not-qualified":"qualified");

if(desqualificado){
  result.innerHTML="<strong>Pelas informações que você respondeu, neste momento não identificamos os principais requisitos que indicariam possível direito ao salário-maternidade.</strong><p>Isso não significa, por si só, uma conclusão definitiva sobre o seu caso. O direito pode depender de informações do seu histórico previdenciário que não foram consideradas nesta triagem.</p><p>Por isso, não vamos encaminhar seus dados automaticamente para o WhatsApp. Se alguma resposta estiver incorreta, se você tiver contribuições anteriores ou se houver alguma situação diferente da informada, vale fazer uma análise individualizada.</p>";
  form.after(result);
  form.style.display="none";
  result.scrollIntoView({behavior:"smooth",block:"center"});
  return;
}

const nome=d.get("nome")||"Não informado";
const fase=d.get("fase")||"Não informado";
const dataMsg=data||"Não sei informar";
const whatsapp=d.get("whatsapp")||"Não informado";

const msg=
"NOVO LEAD — SALÁRIO-MATERNIDADE\n\n"+
"Nome: "+nome+"\n"+
"Fase: "+fase+"\n"+
"Situação profissional: "+trabalho+"\n"+
"Vínculo/contribuições com o INSS: "+vinculo+"\n"+
"Última contribuição: "+ultima+"\n"+
"Pedido ao INSS: "+pedido+"\n"+
"Data do parto/nascimento: "+dataMsg+"\n"+
"WhatsApp informado: "+whatsapp+"\n\n"+
"Solicitação: A lead quer saber se pode ter direito ao salário-maternidade e solicita análise do caso.";

result.innerHTML="<strong>Pronto. Recebemos suas respostas.</strong><p>Seu atendimento pode continuar pelo WhatsApp com todas as informações preenchidas.</p>";
form.after(result);
result.scrollIntoView({behavior:"smooth",block:"center"});

setTimeout(()=>{
  const numeroWhatsApp="5500000000000";
  window.location.href="https://wa.me/"+numeroWhatsApp+"?text="+encodeURIComponent(msg);
},700);
});