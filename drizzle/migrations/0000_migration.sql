create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));

create table public.admin_phones (phone text primary key);
grant all on public.admin_phones to service_role;
alter table public.admin_phones enable row level security;

create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  code text not null,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
grant all on public.otp_codes to service_role;
alter table public.otp_codes enable row level security;

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  phone text not null unique,
  full_name text not null,
  email text,
  address text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.members to authenticated;
grant all on public.members to service_role;
alter table public.members enable row level security;
create policy "member read own" on public.members for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin write members" on public.members for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.chit_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  chit_value numeric not null,
  installments int not null,
  sub_amount numeric not null,
  next_auction timestamptz,
  status text not null default 'running',
  created_at timestamptz not null default now()
);
grant select on public.chit_groups to authenticated;
grant insert, update, delete on public.chit_groups to authenticated;
grant all on public.chit_groups to service_role;
alter table public.chit_groups enable row level security;
create policy "groups readable" on public.chit_groups for select to authenticated using (true);
create policy "admin write groups" on public.chit_groups for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members(id) on delete cascade,
  group_id uuid not null references public.chit_groups(id) on delete cascade,
  chit_ref text not null unique,
  enrol_position text not null default 'NPS',
  paid_upto int not null default 0,
  net_due numeric not null default 0,
  dividend numeric not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.subscriptions to authenticated;
grant all on public.subscriptions to service_role;
alter table public.subscriptions enable row level security;
create policy "sub read own" on public.subscriptions for select to authenticated using (
  public.has_role(auth.uid(),'admin') or exists(select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
create policy "admin write subs" on public.subscriptions for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  entry_date date not null default current_date,
  sub_amount numeric not null default 0,
  adj_inst int not null,
  charges numeric not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.ledger_entries to authenticated;
grant all on public.ledger_entries to service_role;
alter table public.ledger_entries enable row level security;
create policy "ledger read own" on public.ledger_entries for select to authenticated using (
  public.has_role(auth.uid(),'admin') or exists(select 1 from public.subscriptions s join public.members m on m.id=s.member_id where s.id = subscription_id and m.user_id = auth.uid()));
create policy "admin write ledger" on public.ledger_entries for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  txn_id text not null unique,
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  amount numeric not null,
  method text not null default 'UPI',
  status text not null default 'SUCCESS',
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.payments to authenticated;
grant all on public.payments to service_role;
alter table public.payments enable row level security;
create policy "pay read own" on public.payments for select to authenticated using (
  public.has_role(auth.uid(),'admin') or exists(select 1 from public.members m where m.id = member_id and m.user_id = auth.uid()));
create policy "admin write pay" on public.payments for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  address text not null,
  phone text,
  sort int not null default 0
);
grant select on public.branches to anon, authenticated;
grant all on public.branches to service_role;
alter table public.branches enable row level security;
create policy "branches public" on public.branches for select to anon, authenticated using (true);

insert into public.admin_phones(phone) values ('9999999999');

insert into public.members(phone, full_name, address) values
('9791386607','SACHITHANANTHAM RANGASAMY','7/22B New No 34/22BC Ammal Yeri Road, 77th Block, Dadagappatti, Salem - 636005');

insert into public.chit_groups(name, chit_value, installments, sub_amount, next_auction, status) values
('OST80519', 1000000, 50, 20000, '2026-10-21 07:00:00+00', 'running'),
('OST90120', 500000, 25, 20000, '2026-11-05 07:00:00+00', 'upcoming'),
('OST90245', 200000, 20, 10000, '2026-11-12 07:00:00+00', 'upcoming');

insert into public.subscriptions(member_id, group_id, chit_ref, enrol_position, paid_upto, net_due, dividend)
select m.id, g.id, 'OST80519-28', 'NPS', 10, 15160, 49140 from public.members m, public.chit_groups g where m.phone='9791386607' and g.name='OST80519';

insert into public.ledger_entries(subscription_id, entry_date, sub_amount, adj_inst, charges)
select s.id, v.d::date, v.a, v.i, v.c from public.subscriptions s,
(values ('2026-01-09',40000,1,200),('2026-01-30',0,2,0),('2026-02-09',14400,3,0),('2026-03-01',14256,4,0),('2026-04-06',14256,5,0),('2026-05-05',14256,6,0),('2026-06-08',14256,7,0),('2026-07-01',14256,8,0),('2026-08-06',14900,9,0),('2026-09-06',14400,10,0)) as v(d,a,i,c)
where s.chit_ref='OST80519-28';

insert into public.payments(txn_id, subscription_id, member_id, amount, created_at)
select v.t, s.id, s.member_id, v.a, v.d::timestamptz from public.subscriptions s,
(values ('FEUPII570454E04C3',14400,'2026-09-06 15:20:00+00'),('FEUPIQ169BB155EFB',14900,'2026-08-06 05:54:00+00'),('FEUPIQB3793F0C64E',14256,'2026-07-01 06:13:00+00'),('FEUPIQ248D4B837A6',14256,'2026-06-08 02:55:00+00')) as v(t,a,d)
where s.chit_ref='OST80519-28';

insert into public.branches(name, code, address, phone, sort) values
('Central Office','CEL','274/C Thuraiyur Road, Perambalur, Tamil Nadu 621212',null,1),
('Srirangam','SR','No 81/1 Subha Complex, 1st Floor, Ammamandapam Road, Srirangam, Trichy 620005','9750968153',2),
('Thiruvarur','TV','No 19A Vijay Vihar, KYB Upstairs, Keelaveethi, Thiruvarur 610901','7373768192',3),
('Head Office','HO','Trichy, Tamil Nadu 620017',null,4),
('Tiruchirapalli','TR','No 81/1 Subha Complex, Amma Mandapam Road, Srirangam, Trichy 620003','9750968144',5),
('Thanjavur','TJ','74/6/4 1st Floor, Pudhukottai Road, Yagappa Nagar, Thanjavur 613007','9750968500',6),
('Nagapattinam','NG','No 21 Naduvar East Street, Venkateswara Complex, Nagapattinam 611001','04365243339',7),
('Mayiladuthurai','MY','No 28/5A, A.R. Najim Complex, Town Extension, Mayiladuthurai 609001','7373768105',8),
('Kumbakonam','KM','No 41/286 Nageswaran Sannadhi Street, Kumbakonam 612002','7373768100',9),
('Madurai','MD','No 13, 2nd Floor, 2nd Street, Kamaraj Nagar, Chinnachokkikulam, Madurai 625002','7867093256',10),
('Sivagangai','SG','No 251/137, 2nd Floor, Gandhi Street, Sivaganga 630561','7373768194',11);