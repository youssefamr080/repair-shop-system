/**
 * SecuritySettings - RBAC User & Role Management
 * 
 * Features:
 * - Sub-tabs: Users, Roles, Page Locks
 * - Users: List, Create, Edit, Delete, Change Password
 * - Roles: List, Create, Edit, Assign Permissions
 * - Page Locks: Original permission toggles
 */

import { useState, useEffect } from 'react';
import {
    Users,
    Shield,
    Plus,
    Edit2,
    Trash2,
    Key,
    Loader2,
    Save,
    X,
    AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Input,
    Button,
} from '../ui';
import { useAuthStore } from '../../stores';
import { cn } from '../../utils/helpers';

// Theme Constants
const THEME = {
    navy: '#1a237e',
    gold: '#c5a153',
};

// Types
interface User {
    id: number;
    username: string;
    display_name: string;
    role_id: number;
    role_name?: string;
    role_display_name?: string;
    is_active: number;
    last_login: string | null;
}

interface Role {
    id: number;
    name: string;
    display_name_ar: string;
    description?: string;
    is_system: number;
}

interface Permission {
    id: number;
    code: string;
    display_name_ar: string;
    module: string;
}

// Sub-tabs
const SUB_TABS = [
    { id: 'users', label: 'المستخدمين', icon: Users },
    { id: 'roles', label: 'الأدوار', icon: Shield },
] as const;

type SubTabId = typeof SUB_TABS[number]['id'];

export function SecuritySettings() {
    const [activeSubTab, setActiveSubTab] = useState<SubTabId>('users');

    return (
        <div className="space-y-6">
            {/* Sub-tab Navigation */}
            <div
                className="flex gap-1 p-1 rounded-lg border"
                style={{ backgroundColor: `${THEME.navy}05`, borderColor: `${THEME.navy}15` }}
            >
                {SUB_TABS.map((tab) => {
                    const isActive = activeSubTab === tab.id;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id)}
                            className={cn(
                                'flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all flex-1 justify-center',
                                isActive
                                    ? 'shadow-sm text-white'
                                    : 'text-muted-foreground hover:bg-muted/50'
                            )}
                            style={isActive ? { backgroundColor: THEME.navy } : undefined}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab Content */}
            {activeSubTab === 'users' && <UsersManagement />}
            {activeSubTab === 'roles' && <RolesManagement />}
        </div>
    );
}

// ============================================
// USERS MANAGEMENT
// ============================================
function UsersManagement() {
    const [users, setUsers] = useState<User[]>([]);
    const [roles, setRoles] = useState<Role[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [changingPasswordFor, setChangingPasswordFor] = useState<User | null>(null);
    const { user: currentUser } = useAuthStore();

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [usersData, rolesData] = await Promise.all([
                window.ipcRenderer.invoke('db:users:list'),
                window.ipcRenderer.invoke('db:roles:list'),
            ]);
            setUsers(usersData || []);
            setRoles(rolesData || []);
        } catch (error) {
            toast.error('فشل تحميل البيانات');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDeleteUser = async (user: User) => {
        if (user.id === currentUser?.id) {
            toast.error('لا يمكنك حذف حسابك الحالي');
            return;
        }

        if (!confirm(`هل تريد حذف المستخدم "${user.display_name}"؟`)) return;

        try {
            const result = await window.ipcRenderer.invoke('db:users:delete', user.id);
            if (result.success) {
                toast.success('تم حذف المستخدم');
                loadData();
            } else {
                toast.error(result.error || 'فشل حذف المستخدم');
            }
        } catch (error) {
            toast.error('فشل حذف المستخدم');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: THEME.navy }} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold" style={{ color: THEME.navy }}>
                        إدارة المستخدمين
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        إضافة وتعديل المستخدمين وصلاحياتهم
                    </p>
                </div>
                <Button
                    onClick={() => setShowAddModal(true)}
                    style={{ backgroundColor: THEME.navy }}
                >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة مستخدم
                </Button>
            </div>

            {/* Users Table */}
            <Card>
                <CardContent className="p-0">
                    <table className="w-full">
                        <thead className="border-b bg-muted/50">
                            <tr>
                                <th className="text-right p-3 font-medium">المستخدم</th>
                                <th className="text-right p-3 font-medium">الدور</th>
                                <th className="text-right p-3 font-medium">آخر دخول</th>
                                <th className="text-right p-3 font-medium">الحالة</th>
                                <th className="text-center p-3 font-medium">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                                    <td className="p-3">
                                        <div>
                                            <p className="font-medium">{user.display_name}</p>
                                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <span
                                            className="px-2 py-1 rounded-full text-xs font-medium"
                                            style={{
                                                backgroundColor: user.role_name === 'admin' ? `${THEME.gold}30` : `${THEME.navy}15`,
                                                color: user.role_name === 'admin' ? THEME.gold : THEME.navy
                                            }}
                                        >
                                            {user.role_display_name || user.role_name}
                                        </span>
                                    </td>
                                    <td className="p-3 text-sm text-muted-foreground">
                                        {user.last_login
                                            ? new Date(user.last_login).toLocaleDateString('ar-EG')
                                            : 'لم يسجل دخول بعد'
                                        }
                                    </td>
                                    <td className="p-3">
                                        <span className={cn(
                                            'px-2 py-1 rounded-full text-xs font-medium',
                                            user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        )}>
                                            {user.is_active ? 'نشط' : 'معطل'}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setEditingUser(user)}
                                                title="تعديل"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setChangingPasswordFor(user)}
                                                title="تغيير كلمة المرور"
                                            >
                                                <Key className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteUser(user)}
                                                className="text-red-600 hover:text-red-700"
                                                title="حذف"
                                                disabled={user.id === currentUser?.id}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {users.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                        لا يوجد مستخدمين
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Add User Modal */}
            {showAddModal && (
                <UserFormModal
                    roles={roles}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadData();
                    }}
                />
            )}

            {/* Edit User Modal */}
            {editingUser && (
                <UserFormModal
                    user={editingUser}
                    roles={roles}
                    onClose={() => setEditingUser(null)}
                    onSuccess={() => {
                        setEditingUser(null);
                        loadData();
                    }}
                />
            )}

            {/* Change Password Modal */}
            {changingPasswordFor && (
                <ChangePasswordModal
                    user={changingPasswordFor}
                    onClose={() => setChangingPasswordFor(null)}
                    onSuccess={() => {
                        setChangingPasswordFor(null);
                        toast.success('تم تغيير كلمة المرور');
                    }}
                />
            )}
        </div>
    );
}

// ============================================
// USER FORM MODAL
// ============================================
function UserFormModal({
    user,
    roles,
    onClose,
    onSuccess,
}: {
    user?: User;
    roles: Role[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const isEditing = !!user;
    const [formData, setFormData] = useState({
        username: user?.username || '',
        password: '',
        display_name: user?.display_name || '',
        role_id: user?.role_id || roles[0]?.id || 1,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        try {
            if (isEditing) {
                const result = await window.ipcRenderer.invoke('db:users:update', user.id, {
                    display_name: formData.display_name,
                    role_id: formData.role_id,
                });
                if (!result.success) throw new Error(result.error);
                toast.success('تم تحديث المستخدم');
            } else {
                if (!formData.username || !formData.password) {
                    setError('يرجى ملء جميع الحقول');
                    setIsSubmitting(false);
                    return;
                }
                const result = await window.ipcRenderer.invoke('db:users:create', formData);
                if (!result.success) throw new Error(result.error);
                toast.success('تم إنشاء المستخدم');
            }
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle style={{ color: THEME.navy }}>
                        {isEditing ? 'تعديل مستخدم' : 'إضافة مستخدم'}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {!isEditing && (
                            <div>
                                <label className="block text-sm font-medium mb-1">اسم المستخدم</label>
                                <Input
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    placeholder="username"
                                    dir="ltr"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">الاسم المعروض</label>
                            <Input
                                value={formData.display_name}
                                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                                placeholder="الاسم الكامل"
                            />
                        </div>

                        {!isEditing && (
                            <div>
                                <label className="block text-sm font-medium mb-1">كلمة المرور</label>
                                <Input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium mb-1">الدور</label>
                            <select
                                value={formData.role_id}
                                onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
                                className="w-full h-10 px-3 rounded-md border bg-background"
                            >
                                {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                        {role.display_name_ar}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" type="button" onClick={onClose}>
                                إلغاء
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                style={{ backgroundColor: THEME.navy }}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 ml-2" />
                                        {isEditing ? 'تحديث' : 'إنشاء'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================
// CHANGE PASSWORD MODAL
// ============================================
function ChangePasswordModal({
    user,
    onClose,
    onSuccess,
}: {
    user: User;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
            return;
        }

        if (password !== confirmPassword) {
            setError('كلمة المرور غير متطابقة');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await window.ipcRenderer.invoke('db:users:changePassword', user.id, password);
            if (!result.success) throw new Error(result.error);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'فشل تغيير كلمة المرور');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md mx-4">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle style={{ color: THEME.navy }}>
                        تغيير كلمة المرور
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        تغيير كلمة المرور للمستخدم: <strong>{user.display_name}</strong>
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">كلمة المرور الجديدة</label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">تأكيد كلمة المرور</label>
                            <Input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" type="button" onClick={onClose}>
                                إلغاء
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                style={{ backgroundColor: THEME.navy }}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Key className="h-4 w-4 ml-2" />
                                        تغيير
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

// ============================================
// ROLES MANAGEMENT
// ============================================
function RolesManagement() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [rolesData, permsData] = await Promise.all([
                window.ipcRenderer.invoke('db:roles:list'),
                window.ipcRenderer.invoke('db:permissions:getAll'),
            ]);
            setRoles(rolesData || []);
            setPermissions(permsData || []);
        } catch (error) {
            toast.error('فشل تحميل البيانات');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleDeleteRole = async (role: Role) => {
        if (role.is_system) {
            toast.error('لا يمكن حذف هذا الدور');
            return;
        }

        if (!confirm(`هل تريد حذف الدور "${role.display_name_ar}"؟`)) return;

        try {
            const result = await window.ipcRenderer.invoke('db:roles:delete', role.id);
            if (result.success) {
                toast.success('تم حذف الدور');
                loadData();
            } else {
                toast.error(result.error || 'فشل حذف الدور');
            }
        } catch (error) {
            toast.error('فشل حذف الدور');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" style={{ color: THEME.navy }} />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold" style={{ color: THEME.navy }}>
                        إدارة الأدوار
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        إنشاء أدوار جديدة وتحديد صلاحياتها
                    </p>
                </div>
                <Button
                    onClick={() => setShowAddModal(true)}
                    style={{ backgroundColor: THEME.navy }}
                >
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة دور
                </Button>
            </div>

            {/* Roles Cards */}
            <div className="grid gap-4 md:grid-cols-2">
                {roles.map((role) => (
                    <Card key={role.id} className="relative overflow-hidden">
                        {role.is_system === 1 && (
                            <div
                                className="absolute top-0 right-0 px-2 py-0.5 text-xs font-medium text-white rounded-bl"
                                style={{ backgroundColor: THEME.gold }}
                            >
                                نظام
                            </div>
                        )}
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-base" style={{ color: THEME.navy }}>
                                    {role.display_name_ar}
                                </CardTitle>
                                {!role.is_system && (
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setEditingRole(role)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteRole(role)}
                                            className="text-red-600"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground">
                                {role.description || `الاسم: ${role.name}`}
                            </p>
                            {role.is_system === 1 && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    ⚠️ هذا الدور محمي ولا يمكن تعديله
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add Role Modal */}
            {showAddModal && (
                <RoleFormModal
                    permissions={permissions}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        loadData();
                    }}
                />
            )}

            {/* Edit Role Modal */}
            {editingRole && (
                <RoleFormModal
                    role={editingRole}
                    permissions={permissions}
                    onClose={() => setEditingRole(null)}
                    onSuccess={() => {
                        setEditingRole(null);
                        loadData();
                    }}
                />
            )}
        </div>
    );
}

// ============================================
// ROLE FORM MODAL
// ============================================
function RoleFormModal({
    role,
    permissions,
    onClose,
    onSuccess,
}: {
    role?: Role;
    permissions: Permission[];
    onClose: () => void;
    onSuccess: () => void;
}) {
    const isEditing = !!role;
    const [formData, setFormData] = useState({
        name: role?.name || '',
        display_name_ar: role?.display_name_ar || '',
        description: role?.description || '',
    });
    const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Load role permissions if editing
    useEffect(() => {
        if (role) {
            window.ipcRenderer.invoke('db:roles:getPermissions', role.id)
                .then((perms) => {
                    if (Array.isArray(perms)) {
                        setSelectedPermissions(perms.map((p: { id: number }) => p.id));
                    }
                });
        }
    }, [role]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!formData.name || !formData.display_name_ar) {
            setError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEditing) {
                const result = await window.ipcRenderer.invoke('db:roles:update', role.id, {
                    display_name_ar: formData.display_name_ar,
                    description: formData.description,
                    permission_ids: selectedPermissions,
                });
                if (!result.success) throw new Error(result.error);
                toast.success('تم تحديث الدور');
            } else {
                const result = await window.ipcRenderer.invoke('db:roles:create', {
                    ...formData,
                    permission_ids: selectedPermissions,
                });
                if (!result.success) throw new Error(result.error);
                toast.success('تم إنشاء الدور');
            }
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'حدث خطأ');
        } finally {
            setIsSubmitting(false);
        }
    };

    const togglePermission = (permId: number) => {
        setSelectedPermissions((prev) =>
            prev.includes(permId)
                ? prev.filter((id) => id !== permId)
                : [...prev, permId]
        );
    };

    // Group permissions by module
    const permissionsByCategory = permissions.reduce((acc, perm) => {
        const cat = perm.module || 'other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
                <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-card z-10">
                    <CardTitle style={{ color: THEME.navy }}>
                        {isEditing ? 'تعديل دور' : 'إضافة دور'}
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium mb-1">اسم الدور (بالإنجليزية)</label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="manager"
                                    dir="ltr"
                                    disabled={isEditing}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">الاسم المعروض (بالعربية)</label>
                                <Input
                                    value={formData.display_name_ar}
                                    onChange={(e) => setFormData({ ...formData, display_name_ar: e.target.value })}
                                    placeholder="مدير"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">الوصف (اختياري)</label>
                            <Input
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="وصف مختصر للدور"
                            />
                        </div>

                        {/* Permissions Selection */}
                        <div>
                            <label className="block text-sm font-medium mb-2">الصلاحيات</label>
                            <div className="border rounded-lg p-4 max-h-60 overflow-auto space-y-4">
                                {Object.entries(permissionsByCategory).map(([category, perms]) => (
                                    <div key={category}>
                                        <h4 className="font-medium text-sm mb-2 capitalize" style={{ color: THEME.navy }}>
                                            {category}
                                        </h4>
                                        <div className="grid gap-2 md:grid-cols-2">
                                            {perms.map((perm) => (
                                                <label
                                                    key={perm.id}
                                                    className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPermissions.includes(perm.id)}
                                                        onChange={() => togglePermission(perm.id)}
                                                        className="rounded"
                                                    />
                                                    <span className="text-sm">{perm.display_name_ar}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 text-sm">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" type="button" onClick={onClose}>
                                إلغاء
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                style={{ backgroundColor: THEME.navy }}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="h-4 w-4 ml-2" />
                                        {isEditing ? 'تحديث' : 'إنشاء'}
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

