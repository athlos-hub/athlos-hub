package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.entity.Notification;
import br.com.athloshub.social_service.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/social/notifications")
@RequiredArgsConstructor
public class NotificationController {
    
    private final NotificationService notificationService;
    
    @GetMapping
    public ResponseEntity<ApiResponse<Page<Notification>>> getMyNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Notification> notifications = notificationService.getMyNotifications(pageable);
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }
    
    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        long count = notificationService.getUnreadCount();
        return ResponseEntity.ok(ApiResponse.success(Map.of("count", count)));
    }
    
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> markAsRead(@PathVariable UUID id) {
        notificationService.markAsRead(id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("read", true)));
    }
    
    @PutMapping("/read-all")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> markAllAsRead() {
        notificationService.markAllAsRead();
        return ResponseEntity.ok(ApiResponse.success(Map.of("success", true)));
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Boolean>>> deleteNotification(@PathVariable UUID id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(ApiResponse.success(Map.of("deleted", true)));
    }
}
