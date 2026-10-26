const o="https://trustcapitalcopier.com/api/news-api";async function a(){try{const n=await(await fetch(o)).json();d(n)}catch(e){console.error("Ticker Error:",e)}}function r(e){const n=e.toLowerCase(),s=["rise","surge","growth","up","beat","climb","higher","steady","rally"],i=["fall","dip","slump","down","miss","weak","drop","negative","plunge"];return s.some(t=>n.includes(t))?"up":i.some(t=>n.includes(t))?"down":"neutral"}function d(e){const n=document.getElementById("news-ticker"),s=[...e,...e];n.innerHTML=s.map(i=>{const t=r(i.topic),c=new Date(i.topic_date).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return`
                <div class="news-item">
                    <span class="news-title">${i.topic}</span>
                    <span class="news-sentiment-${t}">
                        ${t==="up"?'<i data-lucide="trending-up" style="width:14px"></i>':t==="down"?'<i data-lucide="trending-down" style="width:14px"></i>':""}
                    </span>
                    <span class="news-time">
                        <i data-lucide="clock" style="width:12px"></i>
                        ${c}
                    </span>
                </div>
            `}).join(""),window.lucide&&lucide.createIcons()}a();setInterval(a,3e5);
