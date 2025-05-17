import { Helmet, HelmetProvider } from "react-helmet-async";

interface PageMetaProps {
  title: string;
  description: string;
}

const PageMeta: React.FC<PageMetaProps> = ({ title, description }) => {
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
    </Helmet>
  );
};

export const AppWrapper = ({ children }: { children: React.ReactNode }) => (
  <HelmetProvider>{children}</HelmetProvider>
);

export default PageMeta;
