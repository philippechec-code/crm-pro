#!/usr/bin/env python3
import sys, re, psycopg2
DB = "postgresql://postgres:CrmPro2026@localhost:5432/crm_telepro"
def norm(p):
    if not p: return None
    d = re.sub(r'\D','',str(p))
    if d.startswith('33') and len(d)==11: d='0'+d[2:]
    return d if len(d)>=9 else None
def parse(f):
    recs=[]
    with open(f,'r',encoding='utf-8-sig') as x: c=x.read()
    dl=';' if c.count(';')>c.count(',') else ','
    for ln in c.strip().split('\n'):
        if not ln.strip(): continue
        ps=[p.strip().strip('"') for p in ln.split(dl)]
        r={'first_name':'','last_name':'','phone':'','email':'','source':''}
        for p in ps:
            if not p: continue
            if '@' in p: r['email']=p.lower()
            elif re.match(r'^[\d\s\+]{9,}$',p): r['phone']=p
            elif p.isupper() and len(p)<20: r['source']=p
            elif re.search(r'[a-zA-Z]',p):
                n=p.split(' ',1)
                if len(n)==2: r['first_name'],r['last_name']=n
                else: r['last_name']=p
        if r['phone'] or r['email']:
            r['pn']=norm(r['phone'])
            r['el']=r['email'].lower() if r['email'] else None
            recs.append(r)
    return recs
def imp(recs,gid=None,src=None):
    cn=psycopg2.connect(DB);cr=cn.cursor();i=d=0
    for r in recs:
        pn,el=r.get('pn'),r.get('el')
        if pn:
            cr.execute("SELECT 1 FROM leads WHERE phone_normalized=%s LIMIT 1",(pn,))
            if cr.fetchone(): d+=1;continue
        if el:
            cr.execute("SELECT 1 FROM leads WHERE email_lower=%s LIMIT 1",(el,))
            if cr.fetchone(): d+=1;continue
        cr.execute("INSERT INTO leads(first_name,last_name,phone,phone_normalized,email,email_lower,status,source,group_id,created_at,updated_at)VALUES(%s,%s,%s,%s,%s,%s,'nouveau',%s,%s,NOW(),NOW())",(r['first_name'],r['last_name'],r['phone'],pn,r['email'],el,r.get('source')or src or'',gid))
        i+=1
    cn.commit();cr.close();cn.close()
    return i,d
if __name__=='__main__':
    f=sys.argv[1];g=sys.argv[2] if len(sys.argv)>2 else None;s=sys.argv[3] if len(sys.argv)>3 else None
    r=parse(f);print(f"{len(r)} lignes")
    i,d=imp(r,g,s);print(f"OK: {i} importes, {d} doublons")
#!/usr/bin/env python3
import sys, re, psycopg2
DB = "postgresql://postgres:CrmPro2026@localhost:5432/crm_telepro"

def norm(p):
    if not p: return None
    d = re.sub(r'\D','',str(p))
    if d.startswith('33') and len(d)==11: d='0'+d[2:]
    return d if len(d)>=9 else None

def parse(f):
    recs=[]
    with open(f,'r',encoding='utf-8-sig') as x: c=x.read()
    dl=';' if c.count(';')>c.count(',') else ','
    for ln in c.strip().split('\n'):
        if not ln.strip(): continue
        ps=[p.strip().strip('"') for p in ln.split(dl)]
        r={'first_name':'','last_name':'','phone':'','email':'','source':''}
        for p in ps:
            if not p: continue
            if '@' in p: r['email']=p.lower()
            elif re.match(r'^[\d\s\+]{9,}$',p): r['phone']=p
            elif p.isupper() and len(p)<20: r['source']=p
            elif re.search(r'[a-zA-Z]',p):
                n=p.split(' ',1)
                if len(n)==2: r['first_name'],r['last_name']=n
                else: r['last_name']=p
        if r['phone'] or r['email']:
            r['pn']=norm(r['phone'])
            r['el']=r['email'].lower() if r['email'] else None
            recs.append(r)
    return recs

def imp(recs,gid=None,src=None):
    cn=psycopg2.connect(DB)
    cr=cn.cursor()
    i=d=0
    for r in recs:
        pn,el=r.get('pn'),r.get('el')
        if pn:
            cr.execute("SELECT 1 FROM leads WHERE phone_normalized=%s LIMIT 1",(pn,))
            if cr.fetchone(): d+=1;continue
        if el:
            cr.execute("SELECT 1 FROM leads WHERE email_lower=%s LIMIT 1",(el,))
            if cr.fetchone(): d+=1;continue
        cr.execute("INSERT INTO leads(first_name,last_name,phone,phone_normalized,email,email_lower,status,source,group_id,created_at,updated_at)VALUES(%s,%s,%s,%s,%s,%s,'nouveau',%s,%s,NOW(),NOW())",(r['first_name'],r['last_name'],r['phone'],pn,r['email'],el,r.get('source')or src or'',gid))
        i+=1
    cn.commit()
    cr.close()
    cn.close()
    return i,d

if __name__=='__main__':
    f=sys.argv[1]
    g=sys.argv[2] if len(sys.argv)>2 else None
    s=sys.argv[3] if len(sys.argv)>3 else None
    r=parse(f)
    print(f"{len(r)} lignes")
    i,d=imp(r,g,s)
    print(f"OK: {i} importes, {d} doublons")
