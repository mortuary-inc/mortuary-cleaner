export interface MetadataJson {
  name?: string;
  symbol?: string;
  description?: string;
  seller_fee_basis_points?: number;
  image?: string;
  external_url?: string;
  attributes?: JsonMetadataAttribute[];
  properties?: JsonMetadataProperties;
  collection?: {
    name?: string;
    family?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface JsonMetadataAttribute {
  trait_type?: string;
  value?: string;
  [key: string]: unknown;
}

export interface JsonMetadataProperties {
  creators?: JsonMetadataCreator[];
  files?: JsonMetadataFile[];
  [key: string]: unknown;
}

export interface JsonMetadataCreator {
  address?: string;
  share?: number;
  [key: string]: unknown;
}

export interface JsonMetadataFile {
  type?: string;
  uri?: string;
  [key: string]: unknown;
}