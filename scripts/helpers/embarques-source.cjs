const fs=require('node:fs');
const path=require('node:path');
const babel=require('@babel/core');
const root=path.resolve(__dirname,'../..');
function loadSource(file, overrides={}, cache=new Map()){
 const absolute=path.resolve(root,file);if(cache.has(absolute))return cache.get(absolute).exports;
 const module={exports:{}};cache.set(absolute,module);
 const code=babel.transformSync(fs.readFileSync(absolute,'utf8'),{babelrc:false,configFile:false,filename:absolute,plugins:['@babel/plugin-transform-modules-commonjs']}).code;
 const localRequire=id=>{
  if(Object.prototype.hasOwnProperty.call(overrides,id))return overrides[id];
  if(id.startsWith('@/')||id.startsWith('.')){
   let target=id.startsWith('@/')?path.join(root,'src',id.slice(2)):path.resolve(path.dirname(absolute),id);
   if(!path.extname(target))target+='.js';return loadSource(target,overrides,cache);
  }
  return require(id);
 };
 new Function('require','module','exports',code)(localRequire,module,module.exports);return module.exports;
}
function vueOptions(file, keys, bindings={}){
 const parser=require('@babel/parser'),generate=require('@babel/generator').default;
 const text=fs.readFileSync(path.join(root,file),'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
 const ast=parser.parse(text,{sourceType:'module'});
 const opts=ast.program.body.find(n=>n.type==='ExportDefaultDeclaration').declaration;
 opts.properties=opts.properties.filter(p=>keys.includes(p.key.name));
 return new Function(...Object.keys(bindings),'return ('+generate(opts).code+')')(...Object.values(bindings));
}
module.exports={loadSource,vueOptions};
