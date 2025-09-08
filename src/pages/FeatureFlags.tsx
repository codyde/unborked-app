import React, { useState, useEffect, useCallback } from 'react';

export default function FlagsDashboardPage() {
  const [flagsToEdit, setFlagsToEdit] = useState<Record<string, boolean>>({});
  const [flagDescriptions, setFlagDescriptions] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [updatingFlag, setUpdatingFlag] = useState<string | null>(null);
  const [deletingFlag, setDeletingFlag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [newFlagName, setNewFlagName] = useState('');
  const [newFlagDescription, setNewFlagDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fetchFlagsAndDescriptions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const flagsResponse = await fetch('http://localhost:3001/api/flags');
      if (!flagsResponse.ok) {
        throw new Error(`Failed to fetch defaults: ${flagsResponse.statusText}`);
      }
      const flagsData = await flagsResponse.json();
      setFlagsToEdit(flagsData);

      const descResponse = await fetch('http://localhost:3001/api/flags/descriptions');
      if (!descResponse.ok) {
        throw new Error(`Failed to fetch descriptions: ${descResponse.statusText}`);
      }
      const descData = await descResponse.json();
      const descriptionsMap = descData.reduce((acc: Record<string, string>, flag: { name: string, description: string }) => {
        acc[flag.name] = flag.description;
        return acc;
      }, {});
      setFlagDescriptions(descriptionsMap);

    } catch (err) {
      console.error("Error fetching flag data:", err);
      setError(err instanceof Error ? err.message : "Unknown error fetching flag data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFlagsAndDescriptions();
  }, [fetchFlagsAndDescriptions]);

  const handleToggle = async (flagName: string) => {
    const newValue = !flagsToEdit[flagName];
    setError(null);
    setUpdatingFlag(flagName);

    setFlagsToEdit(prev => ({ ...prev, [flagName]: newValue }));

    try {
      const response = await fetch(`http://localhost:3001/api/flags/defaults/${flagName}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: newValue })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.statusText}`);
      }

      console.log(`✅ Flag ${flagName} saved to database`);
      await fetchFlagsAndDescriptions();

    } catch (error) {
      console.error('❌ Error toggling flag:', error);
      setFlagsToEdit(prev => ({ ...prev, [flagName]: !newValue }));
      setError(`Failed to update ${flagName}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setUpdatingFlag(null);
    }
  };

  const handleCreateFlag = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsCreating(true);

    if (!newFlagName.trim()) {
      setError("Flag name cannot be empty.");
      setIsCreating(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newFlagName.trim(), 
          description: newFlagDescription.trim(),
          value: false // Default new flags to false
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.statusText}`);
      }

      console.log(`✅ Flag ${newFlagName} created`);
      setNewFlagName('');
      setNewFlagDescription('');
      await fetchFlagsAndDescriptions(); 

    } catch (error) {
      console.error('❌ Error creating flag:', error);
      setError(`Failed to create flag: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteFlag = async (flagName: string) => {
    if (!window.confirm(`Are you sure you want to delete the flag "${flagName}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    setDeletingFlag(flagName);

    try {
      const response = await fetch(`http://localhost:3001/api/flags/${flagName}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        if (response.status !== 204) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Server error: ${response.statusText}`);
        }
      }

      console.log(`✅ Flag ${flagName} deleted`);
      await fetchFlagsAndDescriptions(); 

    } catch (error) {
      console.error('❌ Error deleting flag:', error);
      setError(`Failed to delete ${flagName}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setDeletingFlag(null);
    }
  };

  const refreshFlags = async () => {
    await fetchFlagsAndDescriptions();
  };

  const filteredFlags = Object.entries(flagsToEdit || {}).filter(([name]) => {
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-10">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Feature Flags Dashboard</h1>
              <p className="mt-1 text-sm text-gray-500">Manage feature flags for the application.</p>
            </div>
            <button
              onClick={refreshFlags} 
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-xs text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m-15.357-2a8.001 8.001 0 0115.357 2m0 0H15" />
              </svg>
              Refresh
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white shadow-sm rounded-md p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Feature Flag</h3>
            <form onSubmit={handleCreateFlag} className="space-y-4">
              <div>
                <label htmlFor="new-flag-name" className="block text-sm font-medium text-gray-700">Flag Name</label>
                <input
                  type="text"
                  id="new-flag-name"
                  value={newFlagName}
                  onChange={(e) => setNewFlagName(e.target.value)}
                  placeholder="e.g., NEW_FEATURE_X"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor="new-flag-desc" className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                <input
                  type="text"
                  id="new-flag-desc"
                  value={newFlagDescription}
                  onChange={(e) => setNewFlagDescription(e.target.value)}
                  placeholder="Describe what this flag controls"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-xs focus:outline-hidden focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading || isCreating}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-xs text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create Flag'}
              </button>
            </form>
          </div>

          <div className="bg-white shadow-sm overflow-hidden rounded-md">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      Loading flags...
                    </td>
                  </tr>
                ) : filteredFlags.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                      No flags found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredFlags.map(([name, value]) => {
                    const isUpdatingThis = updatingFlag === name;
                    const isDeletingThis = deletingFlag === name;
                    return (
                      <tr key={name} className={`${isUpdatingThis ? "bg-yellow-50" : isDeletingThis ? "bg-red-50 opacity-70" : ""}`}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${value ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                            {value ? 'Enabled' : 'Disabled'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {flagDescriptions[name] || '--'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-3">
                            <button
                              className={`relative inline-flex shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
                              onClick={() => handleToggle(name)}
                              disabled={isUpdatingThis || isDeletingThis}
                            >
                              <span
                                className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transform ring-0 transition ease-in-out duration-200 ${value ? 'translate-x-5' : 'translate-x-0'}`}>
                              </span>
                            </button>
                            {isUpdatingThis && (
                              <span className="text-xs text-orange-500 animate-pulse">Saving...</span>
                            )}
                            <button
                              onClick={() => handleDeleteFlag(name)}
                              disabled={isUpdatingThis || isDeletingThis}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={`Delete flag ${name}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                            {isDeletingThis && (
                              <span className="text-xs text-red-500 animate-pulse">Deleting...</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}