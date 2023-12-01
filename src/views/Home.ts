export interface Videodatalist {
  stampTime: number,
  name: string,
  cover: string,
  preview: string,
  url: string,
  datails: {
    time: string,
    size: string
  }
}

export interface listVideoHasObj{
  showPreview: boolean[],
  filters: boolean[],
}
