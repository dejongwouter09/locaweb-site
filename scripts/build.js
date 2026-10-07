import {mkdirSync,rmSync,cpSync,copyFileSync,readFileSync,writeFileSync} from 'node:fs';
rmSync('dist',{recursive:true,force:true});mkdirSync('dist',{recursive:true});cpSync('public','dist',{recursive:true});
let html=readFileSync('dist/index.html','utf8').replace('<meta charset="utf-8">','<meta charset="utf-8"><meta name="bloc-transport" content="vercel">');
writeFileSync('dist/index.html',html);
copyFileSync('node_modules/three/build/three.module.js','dist/three.js');copyFileSync('node_modules/three/build/three.core.js','dist/three.core.js');
console.log('Version Vercel préparée dans dist/.');
