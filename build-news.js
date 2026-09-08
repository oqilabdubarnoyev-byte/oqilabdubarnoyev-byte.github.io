// MAYDON — RSS'дан автоматик news.js яратувчи скрипт.
// GitHub Actions уни ҳар соатда ишга туширади. Node 18+ керак (fetch ички).

const fs = require('fs');

// ====== МАНБА(ЛАР) ======
// Ўз манбангизни шу ерга қўйинг. Стандарт RSS 2.0 ленаси бўлса кифоя.
// Championat.asia ходими бўлганингиз учун ўз таҳририятингиз ленасини
// ишлатиш энг тўғриси — рухсат ва сифат жиҳатидан.
const FEEDS = [
  { url: 'https://stadion.uz/news/rss', source: 'Stadion.uz' }
  // { url: 'https://championat.asia/uz/rss', source: 'Championat.asia' },
];
const MAX_ITEMS = 12;

function decode(s){
  return (s||'')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1')
    .replace(/<[^>]+>/g,'')
    .replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
    .replace(/&quot;/g,'"').replace(/&#0?39;/g,"'").replace(/&laquo;/g,'«').replace(/&raquo;/g,'»')
    .replace(/&mdash;/g,'—').replace(/\s+/g,' ').trim();
}
function tag(block, name){
  var m = block.match(new RegExp('<'+name+'[^>]*>([\\s\\S]*?)<\\/'+name+'>','i'));
  return m ? decode(m[1]) : '';
}
function hash(s){var h=0;for(var i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return Math.abs(h);}

var MONTHS=['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];
var MON_SHORT=['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];
function fmt(d){
  if(isNaN(d)) return {date:'',time:'',ts:0};
  var dd=d.getDate(), mo=d.getMonth(), hh=('0'+d.getHours()).slice(-2), mi=('0'+d.getMinutes()).slice(-2);
  return { date: dd+' '+MONTHS[mo]+', '+d.getFullYear(), time: dd+' '+MON_SHORT[mo]+', '+hh+':'+mi, ts:d.getTime() };
}
function classify(t){
  t=(t||'').toLowerCase();
  if(/супер\s?лига|superliga|\bтур\b|чемпионат/.test(t)) return {cat:'Суперлига',emoji:'⚽',theme:'th-e'};
  if(/терма|u-?\d\d|ўсмир|ёшлар|osiyo|осиё|миллий жамоа/.test(t)) return {cat:'Терма жамоа',emoji:'🏆',theme:'th-a'};
  if(/трансфер|ўтди|ўтади|имзолади|шартнома|қўшилди|сотиб/.test(t)) return {cat:'Трансфер',emoji:'✈️',theme:'th-b'};
  if(/ҳакам|вар\b|оффсайд|пенальти/.test(t)) return {cat:'Ҳакамлик',emoji:'⚖️',theme:'th-d'};
  if(/интервью|суҳбат/.test(t)) return {cat:'Интервью',emoji:'🎤',theme:'th-c'};
  return {cat:'Янгиликлар',emoji:'📰',theme:'th-c'};
}

async function main(){
  var all=[];
  for(const f of FEEDS){
    try{
      const res=await fetch(f.url,{headers:{'User-Agent':'MaydonBot/1.0 (+github pages)'}});
      if(!res.ok){console.log('Ўтказиб юборилди:',f.url,res.status);continue;}
      const xml=await res.text();
      const items=xml.split(/<item[>\s]/i).slice(1);
      for(const raw of items){
        const block='<item '+raw;
        const title=tag(block,'title');
        const link=tag(block,'link');
        if(!title||!link) continue;
        const desc=tag(block,'description');
        const info=fmt(new Date(tag(block,'pubDate')));
        const cl=classify(title+' '+desc);
        const idm=link.match(/(\d{4,})/);
        all.push({
          id: idm?('n'+idm[1]):('n'+hash(title)),
          title:title, cat:cl.cat,
          summary: desc ? (desc.length>180?desc.slice(0,177)+'…':desc) : title,
          source:f.source, url:link,
          date:info.date, time:info.time, _ts:info.ts,
          emoji:cl.emoji, theme:cl.theme, featured:false
        });
      }
    }catch(e){console.log('Хатолик:',f.url,e.message);}
  }
  if(!all.length){console.log('Ҳеч нарса олинмади — эски news.js сақланади.');return;}
  all.sort(function(a,b){return b._ts-a._ts;});
  var seen={}, list=[];
  for(const it of all){ if(seen[it.id])continue; seen[it.id]=1; delete it._ts; list.push(it); if(list.length>=MAX_ITEMS)break; }
  list[0].featured=true;
  var out="// MAYDON — автоматик янгиланадиган лента. GitHub Actions яратади.\n"
        + "// Охирги янгиланиш: "+new Date().toISOString()+"\n"
        + "window.NEWS = "+JSON.stringify(list,null,2)+";\n";
  fs.writeFileSync('news.js', out);
  console.log('news.js янгиланди:', list.length, 'та хабар');
}
main();
