export interface Modality {
  id: number;
  name: string;
  organization_slug: string;
}

export interface ModalityCreate {
  name: string;
  organization_slug: string;
}

export interface ModalityResponse extends Modality {}
