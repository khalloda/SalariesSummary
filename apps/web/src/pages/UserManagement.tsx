import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../hooks/useAuth';
import {
  UserCreateFormSchema,
  UserUpdateFormSchema,
} from '../validation/users';

interface User {
  id: string;
  username: string;
  email: string | null;
  fullName: string;
  systemId: string | null;
  isActive: boolean;
  roles: string[];
  createdAt: string;
  updatedAt: string;
}

interface Role {
  id: string;
  name: string;
  description: string | null;
  permissions: string[];
  userCount: number;
}

export default function UserManagement() {
  const { t, i18n } = useTranslation();
  const { user: currentUser } = useAuth();
  const isRTL = i18n.language === 'ar';
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<Partial<User & { password: string; confirmPassword: string }>>({
    isActive: true,
    roles: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, { withCredentials: true });
      setUsers(response.data.users);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/roles`, { withCredentials: true });
      setRoles(response.data.roles);
    } catch (error: any) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleCreate = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      fullName: '',
      systemId: '',
      password: '',
      confirmPassword: '',
      isActive: true,
      roles: [],
    });
    setError(null);
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email || '',
      fullName: user.fullName,
      systemId: user.systemId || '',
      password: '',
      confirmPassword: '',
      isActive: user.isActive,
      roles: [...user.roles],
    });
    setError(null);
    setShowForm(true);
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(t('deleteUserConfirm', { username }) || `Are you sure you want to delete user "${username}"?`)) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/users/${id}`, { withCredentials: true });
      alert(t('userDeletedSuccessfully') || 'User deleted successfully');
      fetchUsers();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const schema = editingUser ? UserUpdateFormSchema : UserCreateFormSchema;

      const parseResult = schema.safeParse({
        username: formData.username ?? '',
        fullName: formData.fullName ?? '',
        email: formData.email ?? '',
        systemId: formData.systemId ?? '',
        isActive: formData.isActive ?? true,
        roles: formData.roles ?? [],
        password: formData.password ?? '',
        confirmPassword: formData.confirmPassword ?? '',
      });

      if (!parseResult.success) {
        const message =
          parseResult.error.errors
            .map((err) => err.message)
            .join('\n') || (t('validationError') as string) || 'Validation error';
        setError(message);
        setSaving(false);
        return;
      }

      const data = parseResult.data;

      const submitData: any = {
        username: data.username,
        email: data.email,
        fullName: data.fullName,
        systemId: data.systemId,
        isActive: data.isActive,
        roles: data.roles,
      };

      // Only include password if it's provided
      if (data.password) {
        submitData.password = data.password;
      }

      if (editingUser) {
        await axios.put(`${API_BASE_URL}/users/${editingUser.id}`, submitData, { withCredentials: true });
        alert(t('userUpdatedSuccessfully') || 'User updated successfully');
      } else {
        await axios.post(`${API_BASE_URL}/users`, submitData, { withCredentials: true });
        alert(t('userCreatedSuccessfully') || 'User created successfully');
      }

      setShowForm(false);
      fetchUsers();
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const toggleRole = (roleName: string) => {
    const currentRoles = formData.roles || [];
    if (currentRoles.includes(roleName)) {
      setFormData({ ...formData, roles: currentRoles.filter((r) => r !== roleName) });
    } else {
      setFormData({ ...formData, roles: [...currentRoles, roleName] });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">{t('loading') || 'Loading...'}</p>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto ${isRTL ? 'text-right' : 'text-left'}`}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">{t('userManagement') || 'User Management'}</h1>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          {t('newUser') || '+ New User'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('username') || 'Username'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('fullName') || 'Full Name'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('email') || 'Email'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('roles') || 'Roles'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('status') || 'Status'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions') || 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.fullName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.email || '-'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span
                        key={role}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      user.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.isActive ? (t('active') || 'Active') : (t('inactive') || 'Inactive')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-indigo-600 hover:text-indigo-900 mr-3"
                  >
                    {t('edit') || 'Edit'}
                  </button>
                  {user.id !== currentUser?.id && user.username !== 'khelmy' && (
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      className="text-red-600 hover:text-red-900"
                    >
                      {t('delete') || 'Delete'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingUser ? (t('editUser') || 'Edit User') : (t('createUser') || 'Create User')}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('username') || 'Username'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username || ''}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={!!editingUser}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fullName') || 'Full Name'} *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName || ''}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email') || 'Email'}
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('systemId') || 'System ID'}
                </label>
                <input
                  type="text"
                  value={formData.systemId || ''}
                  onChange={(e) => setFormData({ ...formData, systemId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {(!editingUser || formData.password) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('password') || 'Password'} {editingUser ? '' : '*'}
                    </label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={!editingUser}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('confirmPassword') || 'Confirm Password'} {editingUser ? '' : '*'}
                    </label>
                    <input
                      type="password"
                      value={formData.confirmPassword || ''}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required={!editingUser}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('roles') || 'Roles'}
                </label>
                <div className="space-y-2">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.roles?.includes(role.name) || false}
                        onChange={() => toggleRole(role.name)}
                        className="mr-2"
                      />
                      <span className="text-sm">
                        {role.name} {role.description && `- ${role.description}`}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.isActive || false}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm">{t('active') || 'Active'}</span>
                </label>
              </div>

              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  {t('cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? (t('saving') || 'Saving...') : (t('save') || 'Save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

