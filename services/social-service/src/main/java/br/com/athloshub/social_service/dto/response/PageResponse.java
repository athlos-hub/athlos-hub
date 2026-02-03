package br.com.athloshub.social_service.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PageResponse<T> {
    
    private List<T> items;
    private long totalItems;
    private int totalPages;
    private int currentPage;
    private int pageSize;
    private boolean hasNext;
    private boolean hasPrevious;
    public boolean isFirst() {
        return currentPage == 0;
    }
    public boolean isLast() {
        return currentPage == totalPages - 1 || totalPages == 0;
    }
    public static <T> PageResponse<T> of(
            List<T> items,
            long totalItems,
            int currentPage,
            int pageSize
    ) {
        int totalPages = (int) Math.ceil((double) totalItems / pageSize);
        
        return PageResponse.<T>builder()
                .items(items)
                .totalItems(totalItems)
                .totalPages(totalPages)
                .currentPage(currentPage)
                .pageSize(pageSize)
                .hasNext(currentPage < totalPages - 1)
                .hasPrevious(currentPage > 0)
                .build();
    }
    public static <T> PageResponse<T> empty(int currentPage, int pageSize) {
        return PageResponse.<T>builder()
                .items(List.of())
                .totalItems(0)
                .totalPages(0)
                .currentPage(currentPage)
                .pageSize(pageSize)
                .hasNext(false)
                .hasPrevious(false)
                .build();
    }
}
