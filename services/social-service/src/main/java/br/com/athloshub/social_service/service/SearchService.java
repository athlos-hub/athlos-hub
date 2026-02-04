package br.com.athloshub.social_service.service;

import br.com.athloshub.social_service.entity.Post;
import br.com.athloshub.social_service.repository.PostRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SearchService {
    
    private final PostRepository postRepository;
    
    @Transactional(readOnly = true)
    public Page<Post> searchPosts(String query, Pageable pageable) {
        return postRepository.searchByContent(query, pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<Post> getPopularPosts(int days, Pageable pageable) {
        return postRepository.findPopularPosts(days, pageable);
    }
    
    @Transactional(readOnly = true)
    public Page<Post> getTrendingPosts(Pageable pageable) {
        return getPopularPosts(7, pageable);
    }
}
