export default function Loading() {
    return (
        <div className="space-y-8 animate-pulse">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-8 w-48 bg-gray-200 rounded-lg"></div>
                    <div className="h-4 w-64 bg-gray-100 rounded-lg"></div>
                </div>
                <div className="flex gap-3">
                    <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
                    <div className="h-10 w-32 bg-gray-200 rounded-xl"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 flex items-center gap-5">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl"></div>
                        <div className="space-y-2 flex-1">
                            <div className="h-3 w-16 bg-gray-100 rounded"></div>
                            <div className="h-6 w-24 bg-gray-200 rounded"></div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 bg-white rounded-3xl border border-gray-50 h-96">
                    <div className="p-6 border-b border-gray-50">
                        <div className="h-6 w-32 bg-gray-200 rounded"></div>
                    </div>
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex justify-between items-center">
                                <div className="space-y-1">
                                    <div className="h-4 w-24 bg-gray-200 rounded"></div>
                                    <div className="h-3 w-16 bg-gray-100 rounded"></div>
                                </div>
                                <div className="h-6 w-16 bg-gray-100 rounded-full"></div>
                                <div className="h-5 w-20 bg-gray-200 rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-gray-200 rounded-3xl h-full min-h-[300px]"></div>
            </div>
        </div>
    );
}
