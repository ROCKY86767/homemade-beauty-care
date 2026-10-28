import { readFile, writeFile } from 'node:fs/promises';

const file = 'src/components/LiveChatCustomer.tsx';
const source = await readFile(file, 'utf8');
const broken = '</div>)}<button onClick={()=>setOpen(v=>!v)}';
const fixed = '</div>}<button onClick={()=>setOpen(v=>!v)}';
if (source.includes(broken)) {
  await writeFile(file, source.replace(broken, fixed), 'utf8');
}
