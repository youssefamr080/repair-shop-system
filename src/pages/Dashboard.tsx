/**
 * Dashboard Page - Mayo Fix Enterprise
 * 
 * Phone Repair Management Dashboard with:
 * - Repair tickets overview
 * - Status distribution
 * - Quick actions for technicians
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion } from 'framer-motion';
import { THEME } from '../constants/theme';
import {
  Wrench,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

// Types
interface RepairStats {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  today: number;
}

interface RepairTicket {
  id: string;
  customer_name: string;
  device_type: string;
  status: string;
  created_at: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState<RepairStats>({
    total: 0,
    pending: 0,
    in_progress: 0,
    completed: 0,
    today: 0,
  });
  const [recentTickets, setRecentTickets] = useState<RepairTicket[]>([]);

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get repair tickets
      if (window.database?.repairs?.list) {
        const result = await window.database.repairs.list({}) as unknown;
        // repairs.list returns array directly or object with data
        const tickets: RepairTicket[] = Array.isArray(result)
          ? result
          : ((result as { data?: RepairTicket[] })?.data || []);

        // Calculate stats
        const today = new Date().toISOString().split('T')[0];
        const todayTickets = tickets.filter((t: RepairTicket) =>
          t.created_at?.startsWith(today)
        );

        setStats({
          total: tickets.length,
          pending: tickets.filter((t: RepairTicket) => t.status === 'pending').length,
          in_progress: tickets.filter((t: RepairTicket) => t.status === 'in_progress').length,
          completed: tickets.filter((t: RepairTicket) => t.status === 'completed').length,
          today: todayTickets.length,
        });

        // Recent 5 tickets
        setRecentTickets(tickets.slice(0, 5));
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadDashboardData();
    setIsRefreshing(false);
    toast.success('تم تحديث البيانات');
  };

  const statCards = [
    {
      title: 'إجمالي التذاكر',
      value: stats.total,
      icon: Wrench,
      color: THEME.slate,
      bgColor: `${THEME.slate}15`,
    },
    {
      title: 'قيد الانتظار',
      value: stats.pending,
      icon: Clock,
      color: '#f59e0b',
      bgColor: '#fef3c7',
    },
    {
      title: 'جاري العمل',
      value: stats.in_progress,
      icon: TrendingUp,
      color: '#3b82f6',
      bgColor: '#dbeafe',
    },
    {
      title: 'مكتملة',
      value: stats.completed,
      icon: CheckCircle,
      color: '#10b981',
      bgColor: '#d1fae5',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'in_progress': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'delivered': return '#6b7280';
      default: return THEME.slate;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'قيد الانتظار';
      case 'in_progress': return 'جاري العمل';
      case 'completed': return 'مكتمل';
      case 'delivered': return 'تم التسليم';
      default: return status;
    }
  };

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: THEME.slate }}>
              لوحة التحكم
            </h1>
            <p className="text-muted-foreground mt-1">
              مرحباً بك في Mayo Fix Enterprise
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/repairs')}
              style={{ backgroundColor: THEME.orange }}
            >
              <Plus className="h-4 w-4 ml-2" />
              تذكرة جديدة
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-3xl font-bold mt-2" style={{ color: stat.color }}>
                        {isLoading ? '...' : stat.value}
                      </p>
                    </div>
                    <div
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: stat.bgColor }}
                    >
                      <stat.icon className="h-6 w-6" style={{ color: stat.color }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" style={{ color: THEME.orange }} />
                  إجراءات سريعة
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/repairs')}
                >
                  <Wrench className="h-4 w-4 ml-3" style={{ color: THEME.orange }} />
                  عرض جميع التذاكر
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/suppliers')}
                >
                  <Users className="h-4 w-4 ml-3" style={{ color: THEME.slate }} />
                  موردي قطع الغيار
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/settings')}
                >
                  <AlertCircle className="h-4 w-4 ml-3" />
                  الإعدادات
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Tickets */}
          <motion.div
            className="lg:col-span-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" style={{ color: THEME.slate }} />
                  أحدث التذاكر
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/repairs')}
                >
                  عرض الكل
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    جاري التحميل...
                  </div>
                ) : recentTickets.length === 0 ? (
                  <div className="text-center py-8">
                    <Smartphone className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">لا توجد تذاكر بعد</p>
                    <Button
                      className="mt-4"
                      size="sm"
                      onClick={() => navigate('/repairs')}
                      style={{ backgroundColor: THEME.orange }}
                    >
                      <Plus className="h-4 w-4 ml-2" />
                      إنشاء أول تذكرة
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/repairs/${ticket.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: getStatusColor(ticket.status) }}
                          />
                          <div>
                            <p className="font-medium">{ticket.customer_name}</p>
                            <p className="text-sm text-muted-foreground">{ticket.device_type}</p>
                          </div>
                        </div>
                        <span
                          className="text-xs px-2 py-1 rounded-full"
                          style={{
                            backgroundColor: `${getStatusColor(ticket.status)}20`,
                            color: getStatusColor(ticket.status),
                          }}
                        >
                          {getStatusLabel(ticket.status)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Today's Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card style={{ backgroundColor: `${THEME.orange}08`, borderColor: `${THEME.orange}20` }}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${THEME.orange}20` }}>
                    <TrendingUp className="h-5 w-5" style={{ color: THEME.orange }} />
                  </div>
                  <div>
                    <p className="font-medium">تذاكر اليوم</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-3xl font-bold" style={{ color: THEME.orange }}>
                  {stats.today}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </PageTransition>
  );
}

export default Dashboard;
