const GridShape = () => {
  return (
    <div className="absolute -z-10 h-full w-full">
      <div className="absolute left-0 top-0 -z-10 h-full w-full">
        <div className="absolute left-0 top-0 -z-10 h-full w-full overflow-hidden bg-white dark:bg-gray-900">
          <div className="absolute right-0 top-0 -z-10 hidden h-full w-full grid-cols-[10px_1fr] gap-10 lg:grid">
            <div className="flex flex-col">
              <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
            </div>
            <div className="flex w-full flex-col gap-10">
              <div className="grid w-full grid-cols-[repeat(6,_10px_1fr)] gap-10">
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
                <div className="h-[10px] w-[10px] rounded-full bg-gray-100 dark:bg-gray-800"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GridShape;