const Fmt = {
  date(d) { const n=d||new Date(),p=v=>('0'+v).slice(-2); return p(n.getDate())+'/'+p(n.getMonth()+1)+'/'+n.getFullYear()+' '+p(n.getHours())+':'+p(n.getMinutes()); },
  num(v,dec=0) { return Number(v).toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec}); },
  pct(v) { return Math.round(v)+'%'; },
  cota(v) { return v!=null?v.toFixed(2)+'m':'—'; },
  mmh(v) { return v!=null?v+'mm/h':'—'; },
};
window.Fmt = Fmt;
