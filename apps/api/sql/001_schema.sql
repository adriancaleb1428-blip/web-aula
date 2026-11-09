-- Esquema de Aula Consulting en PostgreSQL.
-- La autorización la aplica el servidor (apps/api); aquí viven los datos, las restricciones,
-- los índices y los triggers que generan los avisos.

create type app_role as enum ('admin', 'teacher', 'student');
create type course_status as enum ('draft', 'published', 'archived');
create type record_status as enum ('active', 'invited', 'completed', 'withdrawn');
create type meeting_status as enum ('scheduled', 'cancelled', 'completed');

-- Cuentas de acceso (la contraseña nunca sale del servidor).
create table users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  created_at timestamptz not null default now(),
  last_sign_in_at timestamptz
);
create unique index users_email_key on users (lower(email));

create table profiles (
  id uuid primary key references users(id) on delete cascade,
  full_name text,
  avatar_url text,
  timezone text not null default 'America/Lima',
  role app_role not null default 'student',
  can_create_courses boolean not null default false,
  phone text,
  company text,
  job_title text,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_role_idx on profiles (role);

create table courses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  description text,
  cover_url text,
  category text,
  academic_period text,
  starts_on date,
  ends_on date,
  status course_status not null default 'draft',
  modality text not null default 'hybrid',
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or starts_on is null or ends_on >= starts_on)
);
create index courses_created_by_idx on courses (created_by);
create index courses_status_idx on courses (status);

create table course_instructors (
  course_id uuid not null references courses(id) on delete cascade,
  instructor_id uuid not null references profiles(id) on delete cascade,
  can_manage boolean not null default false,
  can_create_courses boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (course_id, instructor_id)
);
create index course_instructors_instructor_idx on course_instructors (instructor_id);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status record_status not null default 'active',
  enrolled_at timestamptz not null default now(),
  unique (course_id, student_id)
);
create index enrollments_student_status_idx on enrollments (student_id, status);

create table modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, position)
);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references modules(id) on delete cascade,
  title text not null,
  body text,
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  unique (module_id, position)
);

create table materials (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  module_id uuid references modules(id) on delete set null,
  title text not null,
  description text,
  storage_path text not null,
  mime_type text,
  uploaded_by uuid not null references profiles(id),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index materials_course_idx on materials (course_id);
create index materials_module_idx on materials (module_id);
create index materials_uploaded_by_idx on materials (uploaded_by);

create table meetings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/Lima',
  organizer_id uuid not null references profiles(id),
  room_name text not null default 'Google Meet',
  meeting_url text,
  status meeting_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index meetings_course_start_idx on meetings (course_id, starts_at);
create index meetings_organizer_idx on meetings (organizer_id);

create table course_recordings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  storage_path text not null,
  mime_type text,
  uploaded_by uuid not null references profiles(id),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);
create index course_recordings_course_idx on course_recordings (course_id, created_at desc);
create index course_recordings_uploaded_by_idx on course_recordings (uploaded_by);

create table course_certificates (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  certificate_number text,
  storage_path text not null,
  mime_type text not null default 'application/pdf',
  issued_by uuid not null references profiles(id),
  issued_at timestamptz not null default now()
);
create index course_certificates_course_idx on course_certificates (course_id);
create index course_certificates_student_idx on course_certificates (student_id);
create index course_certificates_issued_by_idx on course_certificates (issued_by);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text,
  resource_type text,
  resource_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications (user_id, created_at desc);
create index notifications_resource_idx on notifications (resource_type, resource_id);

create table support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  full_name text not null,
  email text not null,
  phone text,
  topic text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  email_sent boolean not null default false,
  created_at timestamptz not null default now()
);
create index support_requests_user_idx on support_requests (user_id);

create table course_threads (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  teacher_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (course_id, student_id, teacher_id)
);
create index course_threads_student_idx on course_threads (student_id);
create index course_threads_teacher_idx on course_threads (teacher_id);

create table thread_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references course_threads(id) on delete cascade,
  sender_id uuid not null references profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index thread_messages_conversation_idx on thread_messages (conversation_id, created_at);
create index thread_messages_sender_idx on thread_messages (sender_id);

-- ── Triggers ─────────────────────────────────────────────────────────

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger courses_touch before update on courses for each row execute function touch_updated_at();
create trigger profiles_touch before update on profiles for each row execute function touch_updated_at();

-- Avisos a participantes matriculados y al personal del curso cuando se publica contenido.
create function notify_course_content() returns trigger language plpgsql as $$
declare
  course_title text;
  actor uuid;
  kind_student text;
  kind_staff text;
  label text;
  res text;
begin
  select name into course_title from courses where id = new.course_id;
  if tg_table_name = 'materials' then
    if not new.is_published then return new; end if;
    actor := new.uploaded_by; kind_student := 'material'; kind_staff := 'material_published'; res := 'material';
    label := 'Nuevo material: ' || new.title;
  elsif tg_table_name = 'course_recordings' then
    if not new.is_published then return new; end if;
    actor := new.uploaded_by; kind_student := 'recording'; kind_staff := 'recording_published'; res := 'recording';
    label := 'Nueva grabación: ' || new.title;
  else
    if new.status <> 'scheduled' then return new; end if;
    actor := new.organizer_id; kind_student := 'meeting'; kind_staff := 'meeting_scheduled'; res := 'meeting';
    label := 'Nueva reunión: ' || new.title;
  end if;
  insert into notifications (user_id, kind, title, body, resource_type, resource_id)
  select e.student_id, kind_student, label, course_title, res, new.id
  from enrollments e where e.course_id = new.course_id and e.status = 'active';
  insert into notifications (user_id, kind, title, body, resource_type, resource_id)
  select ci.instructor_id, kind_staff, label, course_title, res, new.id
  from course_instructors ci where ci.course_id = new.course_id and ci.can_manage and ci.instructor_id is distinct from actor;
  return new;
end $$;
create trigger materials_notify after insert on materials for each row execute function notify_course_content();
create trigger recordings_notify after insert on course_recordings for each row execute function notify_course_content();
create trigger meetings_notify after insert on meetings for each row execute function notify_course_content();

-- Al borrar un recurso se borran sus avisos.
create function drop_resource_notifications() returns trigger language plpgsql as $$
begin
  delete from notifications where resource_id = old.id and resource_type = tg_argv[0];
  return old;
end $$;
create trigger materials_drop_notices after delete on materials for each row execute function drop_resource_notifications('material');
create trigger recordings_drop_notices after delete on course_recordings for each row execute function drop_resource_notifications('recording');
create trigger meetings_drop_notices after delete on meetings for each row execute function drop_resource_notifications('meeting');

create function notify_enrollment() returns trigger language plpgsql as $$
declare course_title text; student_name text;
begin
  if new.status <> 'active' then return new; end if;
  select name into course_title from courses where id = new.course_id;
  select coalesce(full_name, 'Un participante') into student_name from profiles where id = new.student_id;
  insert into notifications (user_id, kind, title, body, resource_type, resource_id)
  values (new.student_id, 'course_assigned', 'Te matricularon en ' || course_title, null, 'course', new.course_id);
  insert into notifications (user_id, kind, title, body, resource_type, resource_id)
  select ci.instructor_id, 'student_enrolled', student_name || ' se unió a ' || course_title, null, 'course', new.course_id
  from course_instructors ci where ci.course_id = new.course_id and ci.can_manage;
  return new;
end $$;
create trigger enrollments_notify after insert on enrollments for each row execute function notify_enrollment();

create function notify_instructor() returns trigger language plpgsql as $$
declare course_title text;
begin
  select name into course_title from courses where id = new.course_id;
  insert into notifications (user_id, kind, title, body, resource_type, resource_id)
  values (new.instructor_id, 'course_assigned', 'Te asignaron el curso ' || course_title, null, 'course', new.course_id);
  return new;
end $$;
create trigger instructors_notify after insert on course_instructors for each row execute function notify_instructor();

create function notify_certificate() returns trigger language plpgsql as $$
declare course_title text;
begin
  select name into course_title from courses where id = new.course_id;
  insert into notifications (user_id, kind, title, body, resource_type, resource_id)
  values (new.student_id, 'certificate', 'Nuevo certificado: ' || new.title, course_title, 'course', new.course_id);
  return new;
end $$;
create trigger certificates_notify after insert on course_certificates for each row execute function notify_certificate();

-- Mensajería: avisa a la otra persona y actualiza la fecha del último mensaje.
create function notify_thread_message() returns trigger language plpgsql as $$
declare t course_threads; recipient uuid; sender_name text;
begin
  select * into t from course_threads where id = new.conversation_id;
  recipient := case when new.sender_id = t.student_id then t.teacher_id else t.student_id end;
  select coalesce(full_name, 'un usuario') into sender_name from profiles where id = new.sender_id;
  update course_threads set last_message_at = new.created_at where id = t.id;
  insert into notifications (user_id, kind, title, body, resource_type, resource_id)
  values (recipient, 'message', 'Nuevo mensaje de ' || sender_name, left(new.body, 120), 'conversation', t.id);
  return new;
end $$;
create trigger thread_messages_notify after insert on thread_messages for each row execute function notify_thread_message();

-- Eventos en vivo: el servidor escucha este canal y los reenvía a los navegadores conectados.
create function publish_change() returns trigger language plpgsql as $$
begin
  perform pg_notify('aula_events', json_build_object('table', tg_table_name, 'event', tg_op, 'id', new.id)::text);
  return new;
end $$;
create trigger notifications_publish after insert or update on notifications for each row execute function publish_change();
create trigger thread_messages_publish after insert or update on thread_messages for each row execute function publish_change();
