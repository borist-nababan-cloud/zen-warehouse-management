## 1. Read all rows

let { data: users_profile, error } = await supabase
  .from('users_profile')
  .select('*')

### Read specific columns

let { data: users_profile, error } = await supabase
  .from('users_profile')
  .select('some_column,other_column')

### Read referenced tables

let { data: users_profile, error } = await supabase
  .from('users_profile')
  .select(`
    some_column,
    other_table (
      foreign_key
    )
  `)

### With pagination

let { data: users_profile, error } = await supabase
  .from('users_profile')
  .select('*')
  .range(0, 9)

---

## 2. Filtering
Supabase provides a wide range of filters

### With filtering

let { data: users_profile, error } = await supabase
  .from('users_profile')
  .select("*")

  // Filters
  .eq('column', 'Equal to')
  .gt('column', 'Greater than')
  .lt('column', 'Less than')
  .gte('column', 'Greater than or equal to')
  .lte('column', 'Less than or equal to')
  .like('column', '%CaseSensitive%')
  .ilike('column', '%CaseInsensitive%')
  .is('column', null)
  .in('column', ['Array', 'Values'])
  .neq('column', 'Not equal to')

  // Arrays
  .contains('array_column', ['array', 'contains'])
  .containedBy('array_column', ['contained', 'by'])

  // Logical operators
  .not('column', 'like', 'Negate filter')
  .or('some_column.eq.Some value, other_column.eq.Other value')

---

## 3. Insert rows
insert lets you insert into your tables. You can also insert in bulk and do UPSERT.

insert will also return the replaced values for UPSERT.

### Insert a row

const { data, error } = await supabase
  .from('users_profile')
  .insert([
    { some_column: 'someValue', other_column: 'otherValue' },
  ])
  .select()

### Insert many rows

const { data, error } = await supabase
  .from('users_profile')
  .insert([
    { some_column: 'someValue' },
    { some_column: 'otherValue' },
  ])
  .select()

### Upsert matching rows

const { data, error } = await supabase
  .from('users_profile')
  .upsert({ some_column: 'someValue' })
  .select()

---

## 4. Update rows
Update lets you update rows. update will match all rows by default. You can update specific rows using horizontal filters, e.g. eq, lt, and is.

update will also return the replaced values for UPDATE.

### Update matching rows

const { data, error } = await supabase
  .from('users_profile')
  .update({ other_column: 'otherValue' })
  .eq('some_column', 'someValue')
  .select()

---

## 5. Delete rows
Delete lets you delete rows. delete will match all rows by default, so remember to specify your filters!

### Delete matching rows

const { error } = await supabase
  .from('users_profile')
  .delete()
  .eq('some_column', 'someValue')

## 6. Subscribe to changes
Supabase provides realtime functionality and broadcasts database changes to authorized users depending on Row Level Security (RLS) policies.

### Subscribe to all events

const channels = supabase.channel('custom-all-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'users_profile' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

### Subscribe to inserts

const channels = supabase.channel('custom-insert-channel')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'users_profile' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

### Subscribe to updates

const channels = supabase.channel('custom-update-channel')
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'users_profile' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

### Subscribe to deletes

const channels = supabase.channel('custom-delete-channel')
  .on(
    'postgres_changes',
    { event: 'DELETE', schema: 'public', table: 'users_profile' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

### Subscribe to specific rows

const channels = supabase.channel('custom-filter-channel')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'users_profile', filter: 'some_column=eq.some_value' },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()