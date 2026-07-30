import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { searchQuerySchema, type SearchQuery } from './search.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query(new ZodValidationPipe(searchQuerySchema)) query: SearchQuery,
  ) {
    return this.searchService.search(query);
  }
}
