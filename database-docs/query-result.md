[
  {
    "schemaname": "public",
    "tablename": "master_barang",
    "policyname": "Admin and Superuser can read all products",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = ANY (ARRAY[1, 8])))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "master_barang",
    "policyname": "Admin can delete products",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = 1) AND (users_profile.kode_outlet = master_barang.kode_outlet))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "master_barang",
    "policyname": "Admin can insert products",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = 1) AND (users_profile.kode_outlet = master_barang.kode_outlet))))"
  },
  {
    "schemaname": "public",
    "tablename": "master_barang",
    "policyname": "Admin can update products",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = 1) AND (users_profile.kode_outlet = master_barang.kode_outlet))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = 1) AND (users_profile.kode_outlet = master_barang.kode_outlet))))"
  },
  {
    "schemaname": "public",
    "tablename": "master_barang",
    "policyname": "Outlet users can delete products",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "DELETE",
    "qual": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = ANY (ARRAY[5, 6])) AND (users_profile.kode_outlet = master_barang.kode_outlet))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "master_barang",
    "policyname": "Outlet users can insert products",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "INSERT",
    "qual": null,
    "with_check": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = ANY (ARRAY[5, 6])) AND (users_profile.kode_outlet = master_barang.kode_outlet))))"
  },
  {
    "schemaname": "public",
    "tablename": "master_barang",
    "policyname": "Outlet users can read own outlet products",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "SELECT",
    "qual": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = ANY (ARRAY[5, 6])) AND (users_profile.kode_outlet = master_barang.kode_outlet))))",
    "with_check": null
  },
  {
    "schemaname": "public",
    "tablename": "master_barang",
    "policyname": "Outlet users can update products",
    "permissive": "PERMISSIVE",
    "roles": "{authenticated}",
    "cmd": "UPDATE",
    "qual": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = ANY (ARRAY[5, 6])) AND (users_profile.kode_outlet = master_barang.kode_outlet))))",
    "with_check": "(EXISTS ( SELECT 1\n   FROM users_profile\n  WHERE ((users_profile.uid = uid()) AND (users_profile.user_role = ANY (ARRAY[5, 6])) AND (users_profile.kode_outlet = master_barang.kode_outlet))))"
  }
]