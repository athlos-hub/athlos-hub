export interface Modality {
  id: string;
  name: string;
  organization_slug: string;
}

export interface ModalityCreate {
  name: string;
  organization_slug: string;
}

export interface ModalityResponse extends Modality {}
