interface PageBreadcrumbProps {
  pageTitle: string;
}

const PageBreadcrumb = ({ pageTitle }: PageBreadcrumbProps) => {
  return (
    <div className="mb-6">
      <h2 className="text-title-xl2 font-bold text-black dark:text-white">
        {pageTitle}
      </h2>
    </div>
  );
};

export default PageBreadcrumb;