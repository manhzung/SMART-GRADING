import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import '../../core/network/notification_service.dart';
import '../../domain/entities/notification.entity.dart';

class NotificationPage extends StatefulWidget {
  const NotificationPage({super.key});

  @override
  State<NotificationPage> createState() => _NotificationPageState();
}

class _NotificationPageState extends State<NotificationPage> {
  String _activeFilter = 'Tat ca';
  final List<String> _filters = ['Tat ca', 'Chua doc', 'Ky thi', 'Khieu nai'];

  List<AppNotification> _notifications = [];
  bool _isLoading = false;
  bool _hasMore = true;
  int _page = 1;
  String? _error;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadNotifications();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >=
        _scrollController.position.maxScrollExtent - 200) {
      _loadMore();
    }
  }

  Future<void> _loadNotifications({bool refresh = false}) async {
    if (_isLoading) return;
    if (!refresh && !_hasMore) return;

    setState(() {
      _isLoading = true;
      _error = null;
      if (refresh) {
        _page = 1;
        _hasMore = true;
        _notifications = [];
      }
    });

    try {
      final service = GetIt.instance<NotificationService>();
      final result = await service.getNotifications(page: _page, limit: 20);
      setState(() {
        if (refresh) {
          _notifications = result.results;
        } else {
          _notifications = [..._notifications, ...result.results];
        }
        _hasMore = _page < result.pages;
        _page++;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _onRefresh() async {
    await _loadNotifications(refresh: true);
  }

  Future<void> _loadMore() async {
    if (!_hasMore || _isLoading) return;
    await _loadNotifications();
  }

  List<AppNotification> get _filteredNotifications {
    List<AppNotification> list = _notifications;
    if (_activeFilter == 'Chua doc') {
      list = list.where((n) => !n.isRead).toList();
    } else if (_activeFilter == 'Ky thi') {
      list = list.where((n) => n.filterType == 'Ky thi').toList();
    } else if (_activeFilter == 'Khieu nai') {
      list = list.where((n) => n.filterType == 'Khieu nai').toList();
    }
    return list;
  }

  Future<void> _markAsRead(AppNotification notification) async {
    try {
      final service = GetIt.instance<NotificationService>();
      await service.markAsRead(notification.id);
      setState(() {
        final idx = _notifications.indexWhere((n) => n.id == notification.id);
        if (idx >= 0) {
          _notifications[idx] = AppNotification(
            id: notification.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            isRead: true,
            readAt: DateTime.now(),
            createdAt: notification.createdAt,
            priority: notification.priority,
            data: notification.data,
          );
        }
      });
    } catch (_) {}
  }

  Future<void> _markAllAsRead() async {
    try {
      final service = GetIt.instance<NotificationService>();
      await service.markAllAsRead();
      setState(() {
        _notifications = _notifications.map((n) => AppNotification(
          id: n.id,
          type: n.type,
          title: n.title,
          body: n.body,
          isRead: true,
          readAt: DateTime.now(),
          createdAt: n.createdAt,
          priority: n.priority,
          data: n.data,
        )).toList();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Da danh dau tat ca thong bao la da doc'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {}
  }

  Future<void> _deleteNotification(AppNotification notification) async {
    try {
      final service = GetIt.instance<NotificationService>();
      await service.deleteNotification(notification.id);
      setState(() {
        _notifications = _notifications.where((n) => n.id != notification.id).toList();
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Da xoa thong bao: "${notification.title}"'),
            duration: const Duration(seconds: 2),
          ),
        );
      }
    } catch (_) {}
  }

  Color _getPriorityColor(String priority) {
    switch (priority) {
      case 'urgent':
      case 'high':
        return const Color(0xFFDC2626);
      case 'normal':
        return const Color(0xFFD97706);
      case 'low':
        return const Color(0xFF3B82F6);
      default:
        return const Color(0xFFD97706);
    }
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'exam_published':
      case 'exam_reminder':
      case 'score_available':
        return Icons.assignment_outlined;
      case 'appeal_submitted':
      case 'appeal_resolved':
        return Icons.chat_bubble_outline;
      case 'ai_report_ready':
        return Icons.psychology_outlined;
      default:
        return Icons.campaign_outlined;
    }
  }

  String _formatTime(DateTime dt) {
    final now = DateTime.now();
    final diffMs = now.difference(dt).inMilliseconds;
    final diffMins = diffMs ~/ 60000;
    final diffHours = diffMs ~/ 3600000;
    final diffDays = diffMs ~/ 86400000;

    if (diffMins < 1) return 'Vua xong';
    if (diffMins < 60) return '$diffMins phut truoc';
    if (diffHours < 24) return '$diffHours gio truoc';
    if (diffDays < 7) return '$diffDays ngay truoc';
    return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}';
  }

  void _showNotificationOptions(AppNotification notification) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Text(
                  notification.title,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Color(0xFF0F172A),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const Divider(height: 1, color: Color(0xFFE2E8F0)),
              ListTile(
                leading: Icon(
                  notification.isRead
                      ? Icons.mark_chat_unread_outlined
                      : Icons.mark_chat_read_outlined,
                  color: const Color(0xFF475569),
                ),
                title: Text(
                  notification.isRead
                      ? 'Danh dau la chua doc'
                      : 'Danh dau la da doc',
                  style: const TextStyle(color: Color(0xFF0F172A)),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  if (!notification.isRead) {
                    _markAsRead(notification);
                  }
                },
              ),
              ListTile(
                leading: const Icon(Icons.delete_outline, color: Color(0xFFDC2626)),
                title: const Text(
                  'Xoa thong bao nay',
                  style: TextStyle(color: Color(0xFFDC2626)),
                ),
                onTap: () {
                  Navigator.pop(ctx);
                  _deleteNotification(notification);
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final listToShow = _filteredNotifications;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: const Color(0xFFF8FAFC),
        elevation: 0,
        scrolledUnderElevation: 0,
        automaticallyImplyLeading: false,
        leading: IconButton(
          icon: const Icon(
            Icons.arrow_back,
            color: Color(0xFF0F172A),
            size: 24,
          ),
          onPressed: () => Navigator.pop(context),
        ),
        title: const Text(
          'Thong bao',
          style: TextStyle(
            color: Color(0xFF0F172A),
            fontWeight: FontWeight.bold,
            fontSize: 20,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(
              Icons.playlist_add_check,
              color: Color(0xFF475569),
              size: 26,
            ),
            tooltip: 'Danh dau tat ca la da doc',
            onPressed: _markAllAsRead,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          const Divider(color: Color(0xFFE2E8F0), height: 1, thickness: 1),

          SizedBox(
            height: 60,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: _filters.length,
              itemBuilder: (context, index) {
                final filter = _filters[index];
                final isActive = _activeFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: GestureDetector(
                    onTap: () {
                      setState(() {
                        _activeFilter = filter;
                      });
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        color: isActive ? const Color(0xFF0F172A) : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: isActive
                            ? null
                            : Border.all(color: const Color(0xFFE2E8F0), width: 1.2),
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 6),
                      alignment: Alignment.center,
                      child: Text(
                        filter,
                        style: TextStyle(
                          color: isActive ? Colors.white : const Color(0xFF475569),
                          fontSize: 14,
                          fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          Expanded(
            child: _isLoading && listToShow.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : _error != null && listToShow.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 64,
                              color: const Color(0xFF94A3B8).withValues(alpha: 0.6),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'Khong the tai thong bao',
                              style: TextStyle(
                                color: Color(0xFF64748B),
                                fontSize: 16,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                            const SizedBox(height: 8),
                            TextButton(
                              onPressed: () => _loadNotifications(refresh: true),
                              child: const Text('Thu lai'),
                            ),
                          ],
                        ),
                      )
                    : listToShow.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.notifications_off_outlined,
                                  size: 64,
                                  color: const Color(0xFF94A3B8).withValues(alpha: 0.6),
                                ),
                                const SizedBox(height: 16),
                                const Text(
                                  'Khong co thong bao nao',
                                  style: TextStyle(
                                    color: Color(0xFF64748B),
                                    fontSize: 16,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            onRefresh: _onRefresh,
                            child: ListView.separated(
                              controller: _scrollController,
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                              itemCount: listToShow.length + (_hasMore ? 1 : 0),
                              separatorBuilder: (context, index) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                if (index == listToShow.length) {
                                  return const Center(
                                    child: Padding(
                                      padding: EdgeInsets.all(16.0),
                                      child: CircularProgressIndicator(),
                                    ),
                                  );
                                }

                                final notification = listToShow[index];
                                final priorityColor = _getPriorityColor(notification.priority);
                                final icon = _getIconForType(notification.type);

                                return GestureDetector(
                                  onTap: () {
                                    if (!notification.isRead) {
                                      _markAsRead(notification);
                                    }
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: Colors.white,
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(
                                        color: const Color(0xFFE2E8F0),
                                        width: 1.2,
                                      ),
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Stack(
                                          children: [
                                            Container(
                                              width: 48,
                                              height: 48,
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFF1F5F9),
                                                borderRadius: BorderRadius.circular(12),
                                              ),
                                              child: Icon(
                                                icon,
                                                color: const Color(0xFF475569),
                                                size: 24,
                                              ),
                                            ),
                                            if (!notification.isRead)
                                              Positioned(
                                                top: 4,
                                                right: 4,
                                                child: Container(
                                                  width: 8,
                                                  height: 8,
                                                  decoration: const BoxDecoration(
                                                    color: Color(0xFF0F172A),
                                                    shape: BoxShape.circle,
                                                  ),
                                                ),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Row(
                                                    children: [
                                                      Container(
                                                        width: 6,
                                                        height: 6,
                                                        decoration: BoxDecoration(
                                                          color: priorityColor,
                                                          shape: BoxShape.circle,
                                                        ),
                                                      ),
                                                      const SizedBox(width: 6),
                                                      Text(
                                                        notification.priorityLabel,
                                                        style: TextStyle(
                                                          color: priorityColor,
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 13,
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  Text(
                                                    notification.type,
                                                    style: const TextStyle(
                                                      color: Color(0xFF94A3B8),
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.w600,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              const SizedBox(height: 6),
                                              Text(
                                                notification.title,
                                                style: const TextStyle(
                                                  color: Color(0xFF0F172A),
                                                  fontSize: 15,
                                                  fontWeight: FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(height: 6),
                                              Text(
                                                notification.body,
                                                style: const TextStyle(
                                                  color: Color(0xFF475569),
                                                  fontSize: 13,
                                                  height: 1.4,
                                                ),
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                              const SizedBox(height: 12),
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                children: [
                                                  Text(
                                                    _formatTime(notification.createdAt),
                                                    style: const TextStyle(
                                                      color: Color(0xFF94A3B8),
                                                      fontSize: 12,
                                                      fontWeight: FontWeight.w500,
                                                    ),
                                                  ),
                                                  GestureDetector(
                                                    onTap: () => _showNotificationOptions(notification),
                                                    child: const Padding(
                                                      padding: EdgeInsets.all(4.0),
                                                      child: Icon(
                                                        Icons.more_vert,
                                                        color: Color(0xFF94A3B8),
                                                        size: 20,
                                                      ),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
