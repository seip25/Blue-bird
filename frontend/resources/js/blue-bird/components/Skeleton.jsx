export default function Skeleton() {
    return (
        <div className="min-h-screen w-full bg-gray-50 p-4 md:p-8">
            <div className="animate-pulse flex flex-col gap-6">

                <div className="flex items-center justify-between w-full mb-4">
                    <div className="h-10 w-32 bg-gray-300 rounded-lg"></div>
                    <div className="flex space-x-4">
                        <div className="h-10 w-10 bg-gray-300 rounded-full"></div>
                        <div className="h-10 w-24 bg-gray-300 rounded-lg"></div>
                    </div>
                </div>

                <div className="h-48 md:h-64 w-full bg-gray-300 rounded-2xl"></div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                        <div className="h-40 w-full bg-gray-300 rounded-xl"></div>
                        <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                        <div className="h-4 w-1/2 bg-gray-300 rounded"></div>
                    </div>

                    <div className="space-y-3">
                        <div className="h-40 w-full bg-gray-300 rounded-xl"></div>
                        <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                        <div className="h-4 w-1/2 bg-gray-300 rounded"></div>
                    </div>

                    <div className="space-y-3">
                        <div className="h-40 w-full bg-gray-300 rounded-xl"></div>
                        <div className="h-4 w-3/4 bg-gray-300 rounded"></div>
                        <div className="h-4 w-1/2 bg-gray-300 rounded"></div>
                    </div>
                </div>

                <div className="space-y-2 mt-4">
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-full bg-gray-200 rounded"></div>
                    <div className="h-4 w-2/3 bg-gray-200 rounded"></div>
                </div>

            </div>
        </div>
    )
}