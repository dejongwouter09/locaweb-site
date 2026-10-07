export function generateWorld(changes=[]){
 const blocks=new Map();
 for(let x=-20;x<=20;x++)for(let z=-20;z<=20;z++){
  const h=2+Math.floor(Math.sin(x*.2)*Math.cos(z*.23)*2);
  for(let y=0;y<=h;y++)blocks.set(`${x},${y},${z}`,y===h?'grass':y===0?'stone':'dirt');
  if((x*31+z*17)%107===0&&Math.abs(x)>4){for(let y=h+1;y<h+5;y++)blocks.set(`${x},${y},${z}`,'wood');for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=4;dy<=5;dy++)blocks.set(`${x+dx},${h+dy},${z+dz}`,'leaves');}
 }
 for(const [key,value]of changes)value===null?blocks.delete(key):blocks.set(key,value);
 return blocks;
}
