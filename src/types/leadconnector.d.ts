interface ImportMetaEnv {
  readonly PUBLIC_LEADCONNECTOR_ENABLED?: string;
  readonly PUBLIC_LEADCONNECTOR_EMBED?: string;
  readonly PUBLIC_LEADCONNECTOR_LOCATION_ID?: string;
  readonly PUBLIC_LEADCONNECTOR_WIDGET_ID?: string;
}

interface Window {
  leadConnector?: {
    chatWidget?: {
      openWidget?: () => void;
      closeWidget?: () => void;
      isActive?: () => boolean;
    };
  };
}
