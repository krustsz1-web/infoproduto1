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
  result.innerHTML="<strong>Pelas informações preenchidas, não identificamos neste momento elementos suficientes para uma análise de possível direito ao salário-maternidade.</strong><p>Por isso, não vamos encaminhar seus dados para o WhatsApp. Se houver alguma informação que você tenha dúvida ou que possa estar diferente da situação real, vale buscar uma análise individualizada.</p>";
  form.after(result);
  form.style.display="none";
  result.scrollIntoView({behavior:"smooth",block:"center"});
  return;
}
const dataMsg=data||"Não sei informar";
const msg="Olá, sou "+(d.get("nome")||"")+" e gostaria de saber se posso ter direito ao salário-maternidade. Estou "+(d.get("fase")||"")+" e minha situação é: "+trabalho+". Vínculo/contribuições: "+vinculo+". Última contribuição: "+ultima+". Pedido anterior: "+pedido+". Data do parto/nascimento: "+dataMsg+". WhatsApp: "+(d.get("whatsapp")||"")+"."; 
result.innerHTML="<strong>Pronto. Pelas suas respostas, vale uma análise individualizada do seu caso.</strong><p>Seu atendimento pode continuar pelo WhatsApp.</p>";
form.after(result);
result.scrollIntoView({behavior:"smooth",block:"center"});
setTimeout(()=>{window.location.href="https://wa.me/5500000000000?text="+encodeURIComponent(msg)},700);
});