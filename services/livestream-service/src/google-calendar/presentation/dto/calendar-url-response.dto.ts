export class CalendarUrlResponseDto {
  liveId: string;
  url: string;

  constructor(liveId: string, url: string) {
    this.liveId = liveId;
    this.url = url;
  }
}

export class CalendarUrlSingleResponseDto {
  url: string;

  constructor(url: string) {
    this.url = url;
  }
}
