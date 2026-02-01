"use server";

import { Post, PageResponse } from "@/types/social";

const SOCIAL_API_URL = process.env.API_BASE_URL || "http://localhost:8100/api/v1";

export async function getPublicFeed(page: number = 0, size: number = 10): Promise<PageResponse<Post>> {
  try {
    const url = `${SOCIAL_API_URL}/social/feed/public?page=${page}&size=${size}`;
    console.log('Fetching public feed from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    console.log('Public feed response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Public feed error:', errorText);
      throw new Error(`Failed to fetch public feed: ${response.status}`);
    }

    const text = await response.text();
    console.log('Public feed raw response length:', text.length);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('JSON parse error, raw text (first 500 chars):', text.substring(0, 500));
      console.error('JSON parse error, raw text (last 500 chars):', text.substring(text.length - 500));
      throw parseError;
    }
    
    const pageData = data.data || data;
    
    if (pageData.content) {
      return pageData;
    }
    
    if (Array.isArray(pageData)) {
      return {
        content: pageData,
        last: true,
        first: true,
        totalPages: 1,
        totalElements: pageData.length,
        size: pageData.length,
        number: 0,
      };
    }
    
    return {
      content: [],
      last: true,
      first: true,
      totalPages: 0,
      totalElements: 0,
      size: 0,
      number: 0,
    };
  } catch (error) {
    console.error("Failed to fetch public feed:", error);
    throw error;
  }
}
