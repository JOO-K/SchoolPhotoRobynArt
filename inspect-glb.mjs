import { readFileSync } from 'fs';

const buf = readFileSync('./public/Eric_SP.glb');
const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

const chunk0Len = view.getUint32(12, true);
const jsonStr = buf.slice(20, 20 + chunk0Len).toString('utf8');
const gltf = JSON.parse(jsonStr);

// Full node list with index
console.log('\n=== ALL NODES (index / name / children) ===');
gltf.nodes.forEach((n, i) => {
  const kids = n.children ? n.children.map(c => `${c}:"${gltf.nodes[c].name}"`).join(', ') : '-';
  console.log(`  [${i}] "${n.name}"  skin:${n.skin ?? '-'}  mesh:${n.mesh ?? '-'}  children:[${kids}]`);
});

// Scene root
console.log('\n=== SCENE roots ===');
(gltf.scenes[0]?.nodes ?? []).forEach(ni => {
  console.log(`  root node index: ${ni}  name: "${gltf.nodes[ni].name}"`);
});

// Animation clip 0 – first 10 channels
console.log('\n=== ANIM[0] first 10 channels ===');
const anim = gltf.animations[0];
anim.channels.slice(0, 10).forEach(ch => {
  const nodeName = gltf.nodes[ch.target.node]?.name ?? '???';
  console.log(`  node[${ch.target.node}] "${nodeName}"  path: ${ch.target.path}`);
});

// Check if any animation targets node index NOT present in nodes array
console.log('\n=== Checking animation target node indices ===');
let bad = 0;
gltf.animations.forEach((anim, ai) => {
  anim.channels.forEach(ch => {
    if (!gltf.nodes[ch.target.node]) {
      console.log(`  ANIM[${ai}] channel targets missing node index ${ch.target.node}!`);
      bad++;
    }
  });
});
if (bad === 0) console.log('  All target node indices valid.');

// Skin joints — these are the node indices that make up the skeleton
console.log('\n=== SKIN joints (first skin) ===');
const skin = gltf.skins[0];
console.log(`  Skeleton root node: ${skin.skeleton ?? 'none (implicit)'}`);
skin.joints.slice(0, 10).forEach((ji, i) => {
  console.log(`  joint[${i}] -> node[${ji}] "${gltf.nodes[ji].name}"`);
});
if (skin.joints.length > 10) console.log(`  ... and ${skin.joints.length - 10} more`);
