let currentPath = "";
let filesData = [];
let selected = new Set();

/* ================= LOAD ================= */

function load(){
 fetch(`/api/list?path=${currentPath}`)
 .then(r=>r.json())
 .then(data=>{
   filesData = data;
   render(data);
 });
}

/* ================= RENDER (OPTIMIZED) ================= */

function render(data){
 const container = document.getElementById("files");
 container.innerHTML = "";

 let batchSize = 60;
 let index = 0;

 function loadBatch(){
   let slice = data.slice(index, index + batchSize);

   slice.forEach(f=>{
     let div = document.createElement("div");
     div.className = "card";
     div.dataset.name = f.name;

     div.onclick = () => openItem(f.name, f.type);

     div.innerHTML = `
       <div class="thumb-wrap"
         onmouseover="hoverPreview(this,'${f.name}')"
         onmouseout="stopPreview(this)">
         ${thumb(f)}
       </div>
       <div class="name">${f.name}</div>
     `;

     container.appendChild(div);
   });

   index += batchSize;
 }

 loadBatch();

 container.onscroll = ()=>{
   if(container.scrollTop + container.clientHeight >= container.scrollHeight - 50){
     loadBatch();
   }
 };
}

/* ================= SMART SEARCH ================= */

const TYPE_MAP = {
 video: /\.(mp4|webm)$/i,
 image: /\.(jpg|jpeg|png|gif)$/i,
 audio: /\.(mp3|wav)$/i,
 doc: /\.(pdf|txt)$/i
};

document.getElementById("search").oninput = function(){
 let q = this.value.toLowerCase();

 let result = filesData.filter(f=>{
   if(f.name.toLowerCase().includes(q)) return true;

   if(q.includes("video") || q.includes("movie"))
     return TYPE_MAP.video.test(f.name);

   if(q.includes("image") || q.includes("photo"))
     return TYPE_MAP.image.test(f.name);

   if(q.includes("song") || q.includes("music"))
     return TYPE_MAP.audio.test(f.name);

   return false;
 });

 render(result);
};

/* ================= THUMB ================= */

function thumb(f){
 if(f.type==="folder") return "📁";

 if(/\.(mp4|webm)$/i.test(f.name)){
   return `<img class="thumb"
     src="/api/thumb?path=${currentPath}/${f.name}"
     onerror="this.onerror=null; this.src=''">`;
 }

 if(/\.(jpg|png|jpeg)$/i.test(f.name)){
   return `<img class="thumb"
     src="/api/file?path=${currentPath}/${f.name}">`;
 }

 return "📄";
}

/* ================= HOVER PREVIEW ================= */

function hoverPreview(el, name){
 if(!/\.(mp4|webm)$/i.test(name)) return;

 let video = document.createElement("video");
 video.src = `/api/file?path=${currentPath}/${name}`;
 video.muted = true;
 video.preload = "metadata";
 video.style.width = "100%";
 video.style.height = "100%";

 el.innerHTML = "";
 el.appendChild(video);

 video.onloadedmetadata = ()=>{
   el.onmousemove = e=>{
     let percent = e.offsetX / el.clientWidth;
     video.currentTime = percent * video.duration;
   };
 };
}

function stopPreview(el){
 load(); // restore thumbnails
}

/* ================= FILE OPEN ================= */

function openItem(name,type){
 if(type==="folder"){
   currentPath += (currentPath?"/":"") + name;
   load();
 } else {
   preview(name);
 }
}

/* ================= PREVIEW ================= */

function preview(name){
 let url = `/api/file?path=${currentPath}/${name}`;
 let ext = name.split('.').pop().toLowerCase();

 let html = `<div class="close" onclick="closePreview()">✕</div>`;

 if(["mp4","webm"].includes(ext)){
   html += `<video controls autoplay src="${url}"></video>`;
 }
 else if(["jpg","png","jpeg","gif"].includes(ext)){
   html += `<img src="${url}">`;
 }
 else if(["mp3","wav"].includes(ext)){
   html += `<audio controls autoplay src="${url}"></audio>`;
 }
 else if(["pdf"].includes(ext)){
   html += `<iframe src="${url}"></iframe>`;
 }
 else{
   html += `<a href="${url}" download>Download</a>`;
 }

 document.getElementById("preview").innerHTML = html;
 document.getElementById("overlay").classList.add("active");
}

function closePreview(){
 document.getElementById("overlay").classList.remove("active");
 setTimeout(()=>document.getElementById("preview").innerHTML="",300);
}

/* ================= DOWNLOAD ================= */

function download(name){
 window.open(`/api/download?path=${currentPath}/${name}`);
}

/* ================= SIDEBAR ================= */

function loadSidebar(){
 fetch(`/api/list?path=`)
 .then(r=>r.json())
 .then(data=>{
   let html = "<div class='side-item' onclick='goRoot()'>🏠 Root</div>";

   data.forEach(f=>{
     if(f.type==="folder"){
       html += `<div class="side-item"
         onclick="openFolder('${f.name}')">📁 ${f.name}</div>`;
     }
   });

   document.getElementById("sidebar").innerHTML = html;
 });
}

function openFolder(name){
 currentPath = name;
 load();
}

function goRoot(){
 currentPath = "";
 load();
}

/* ================= UPLOAD ================= */

function upload(){
 fileInput.click();
}

fileInput.onchange = ()=>uploadFiles(fileInput.files);

document.body.ondrop = e=>{
 e.preventDefault();
 uploadFiles(e.dataTransfer.files);
};
document.body.ondragover = e=>e.preventDefault();

function uploadFiles(files){
 for(let file of files){
   let fd = new FormData();
   fd.append("file", file);
   fd.append("path", currentPath);

   fetch("/api/upload",{method:"POST", body:fd})
   .then(load);
 }
}

/* ================= INIT ================= */

load();
loadSidebar();