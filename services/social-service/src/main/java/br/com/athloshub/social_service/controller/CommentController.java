package br.com.athloshub.social_service.controller;

import br.com.athloshub.social_service.dto.request.CreateCommentRequest;
import br.com.athloshub.social_service.dto.response.ApiResponse;
import br.com.athloshub.social_service.dto.response.CommentResponse;
import br.com.athloshub.social_service.entity.Comment;
import br.com.athloshub.social_service.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/social/posts/{postId}/comments")
@RequiredArgsConstructor
public class CommentController {
    
    private final CommentService commentService;
    
    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> createComment(
            @PathVariable UUID postId,
            @Valid @RequestBody CreateCommentRequest request) {
        
        Comment comment = commentService.createComment(postId, request.getContent());
        return ResponseEntity.ok(ApiResponse.success(CommentResponse.from(comment)));
    }
    
    @GetMapping
    public ResponseEntity<ApiResponse<Page<CommentResponse>>> getComments(
            @PathVariable UUID postId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        
        Pageable pageable = PageRequest.of(page, size);
        Page<Comment> comments = commentService.getCommentsByPostId(postId, pageable);
        Page<CommentResponse> response = comments.map(CommentResponse::from);
        
        return ResponseEntity.ok(ApiResponse.success(response));
    }
    
    @PutMapping("/{commentId}")
    public ResponseEntity<ApiResponse<CommentResponse>> updateComment(
            @PathVariable UUID postId,
            @PathVariable UUID commentId,
            @Valid @RequestBody CreateCommentRequest request) {
        
        Comment comment = commentService.updateComment(commentId, request.getContent());
        return ResponseEntity.ok(ApiResponse.success(CommentResponse.from(comment)));
    }
    
    @DeleteMapping("/{commentId}")
    public ResponseEntity<ApiResponse<Void>> deleteComment(
            @PathVariable UUID postId,
            @PathVariable UUID commentId) {
        
        commentService.deleteComment(commentId);
        return ResponseEntity.ok(ApiResponse.success(null));
    }
}
