export interface Videodatalist {
  stampTime: number,
  name: string,
  cover: string,
  preview: string,
  url: string,
  datails: {
    time: string,
    size: string
  },
  isStar: boolean,
}

export interface listVideoHasObj {
  showPreview: boolean[],
  filters: boolean[],
}
