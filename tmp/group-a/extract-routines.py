import pymupdf as f,json,re,bisect
from pathlib import Path
files=[('tiffany','Tiffany Salazar.pdf','bajar de peso, movilidad','2026-09-30','2026-12-30'),('chermey','Chermey Ocampo.pdf','bajar grasa','2026-08-05','2026-11-05'),('yuslin-lauren','Yuslin Lopez, Lauren RUT2.pdf','bajar grasa','2026-08-25','2026-11-25'),('melissa','Melissa Arce.pdf','Recomposición corporal','2026-07-07','2026-10-07'),('yadilet','Yadilet Arroyo.pdf','salud','2026-08-17','2026-11-17')]
result=[]
for key,name,objective,start,end in files:
 routine={'id':key,'sourceFile':name,'objective':objective,'startDate':start,'endDate':end,'coach':'Kengie Araya','days':[]}
 d=f.open(Path(r'C:\Users\aroja\OneDrive\Escritorio')/name)
 for p in d:
  bounds=[121.4,316.4,432.8,514.4,586.2,635.4] if key in ['tiffany','yadilet'] else [116.1,293,402.6,485.8,553.1,608.3]
  lines=[]
  for w in sorted(p.get_text('words'),key=lambda w:(w[1],w[0])):
   match=next((l for l in reversed(lines[-5:]) if abs(l[0]-w[1])<1.5),None)
   if match is None: lines.append([w[1],[w]])
   else:match[1].append(w)
  for y,words in sorted(lines):
   words.sort(key=lambda w:w[0]);txt=' '.join(w[4] for w in words)
   day=re.search(r'D.a #([1-5]).*?\((.*?)\)',txt,re.I)
   if day:
    routine['days'].append({'id':key+'-day-'+day[1],'label':'Día '+day[1],'focus':day[2].strip(),'exercises':[]});continue
   if not routine['days']:continue
   cols=['']*7
   for w in words:
    col=bisect.bisect(bounds,(w[0]+w[2])/2);cols[col]+=(' ' if cols[col] else '')+w[4]
   if cols[0].lower() not in ['articulacion','cuadriceps','gluteo','gluteo/isquio','isquios','isquio','aductores','abductores','pantorrilla','pantorrila','espalda','pecho','hombro','biceps','triceps','core','posteriores','cardiovascular']:continue
   ex={'id':routine['days'][-1]['id']+'-ex-'+str(len(routine['days'][-1]['exercises'])+1),'muscle':cols[0],'name':cols[1],'equipment':cols[2],'sourceMachine':cols[3] if cols[3]!='-' else '', 'sets':int(cols[4]) if cols[4].isdigit() else None,'reps':int(cols[5]) if cols[5].isdigit() else None,'time':cols[6] if cols[6]!='-' else '', 'sourcePage':p.number+1}
   assert ex['name'],(name,p.number,cols)
   routine['days'][-1]['exercises'].append(ex)
 result.append(routine)
assert [len(r['days']) for r in result]==[4,5,5,5,5]
Path('lib/xtreme/trainer-group-a-source.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
for r in result:
 print(r['id'],[(d['label'],len(d['exercises'])) for d in r['days']])
 for d in r['days']:
  for e in d['exercises']:print(d['label'], '|', e['name'], '|',e['equipment'], '|',e['sourceMachine'], '|',e['sets'],e['reps'],e['time'])

