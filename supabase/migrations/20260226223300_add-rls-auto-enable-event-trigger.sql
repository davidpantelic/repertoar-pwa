create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  cmd record;
begin
  for cmd in
    select command_tag, object_type, schema_name, object_identity
    from pg_event_trigger_ddl_commands()
  loop
    if cmd.command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
       and cmd.object_type = 'table'
       and cmd.schema_name = 'public'
    then
      begin
        execute format('alter table %s enable row level security', cmd.object_identity);
      exception
        when others then
          -- Ignore objects that cannot be altered in this context.
          null;
      end;
    end if;
  end loop;
end;
$$;

drop event trigger if exists ensure_rls;

create event trigger ensure_rls
on ddl_command_end
when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
execute function public.rls_auto_enable();
