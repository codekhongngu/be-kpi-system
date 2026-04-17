import { Injectable } from '@nestjs/common';

@Injectable()
export class ExampleService {
  getUserById(id: string) {
    return {
      id,
      name: 'Example User',
      email: 'example@example.com',
    };
  }

  getPosts(page: number, limit: number) {
    return {
      page,
      limit,
      posts: [
        { id: 1, title: 'Post 1' },
        { id: 2, title: 'Post 2' },
      ],
      total: 100,
    };
  }

  createData(data: any) {
    return {
      message: 'Data created successfully',
      data,
      id: '123e4567-e89b-12d3-a456-426614174000',
    };
  }
}
