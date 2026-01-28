"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { importLeads } from "@/app/dashboard/leads/actions";

interface ParsedLead {
  businessName: string;
  email: string;
  contactName?: string;
  phone?: string;
  address?: string;
  industry?: string;
}

export function CSVImport() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [parsedLeads, setParsedLeads] = useState<ParsedLead[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const parseCSV = useCallback((text: string): ParsedLead[] => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].toLowerCase().split(",").map((h) => h.trim());
    const leads: ParsedLead[] = [];

    // Map common header variations
    const headerMap: Record<string, string> = {
      "business name": "businessName",
      businessname: "businessName",
      business: "businessName",
      company: "businessName",
      "company name": "businessName",
      name: "businessName",
      email: "email",
      "email address": "email",
      contact: "contactName",
      "contact name": "contactName",
      contactname: "contactName",
      phone: "phone",
      "phone number": "phone",
      telephone: "phone",
      address: "address",
      industry: "industry",
      sector: "industry",
    };

    const columnIndices: Record<string, number> = {};
    headers.forEach((header, index) => {
      const mapped = headerMap[header] || header;
      if (["businessName", "email", "contactName", "phone", "address", "industry"].includes(mapped)) {
        columnIndices[mapped] = index;
      }
    });

    if (columnIndices.businessName === undefined || columnIndices.email === undefined) {
      throw new Error("CSV must contain 'Business Name' and 'Email' columns");
    }

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));

      const businessName = values[columnIndices.businessName];
      const email = values[columnIndices.email];

      if (!businessName || !email) continue;

      // Basic email validation
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

      leads.push({
        businessName,
        email,
        contactName: columnIndices.contactName !== undefined ? values[columnIndices.contactName] : undefined,
        phone: columnIndices.phone !== undefined ? values[columnIndices.phone] : undefined,
        address: columnIndices.address !== undefined ? values[columnIndices.address] : undefined,
        industry: columnIndices.industry !== undefined ? values[columnIndices.industry] : undefined,
      });
    }

    return leads;
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please select a CSV file");
      return;
    }

    setFile(selectedFile);
    setResult(null);

    try {
      const text = await selectedFile.text();
      const leads = parseCSV(text);
      setParsedLeads(leads);

      if (leads.length === 0) {
        toast.error("No valid leads found in the CSV file");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to parse CSV file");
      setParsedLeads([]);
    }
  };

  const handleImport = async () => {
    if (parsedLeads.length === 0) return;

    setImporting(true);
    try {
      const importResult = await importLeads(parsedLeads);

      if (importResult.error) {
        toast.error(importResult.error);
      } else {
        setResult({
          imported: importResult.imported || 0,
          skipped: importResult.skipped || 0,
          errors: importResult.errors || [],
        });
        toast.success(`Imported ${importResult.imported} leads`);
      }
    } catch {
      toast.error("Failed to import leads");
    } finally {
      setImporting(false);
    }
  };

  const handleDone = () => {
    router.push("/dashboard/leads");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Import Leads from CSV</CardTitle>
          <CardDescription>
            Upload a CSV file with your leads. The file should contain at minimum a
            &quot;Business Name&quot; and &quot;Email&quot; column.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!result ? (
            <>
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  {file ? (
                    <>
                      <FileText className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-900 dark:text-white font-medium">
                        {file.name}
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        {parsedLeads.length} leads found
                      </p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-gray-400 text-sm mt-1">CSV files only</p>
                    </>
                  )}
                </label>
              </div>

              {parsedLeads.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Ready to import {parsedLeads.length} leads. Duplicate emails will
                    be skipped.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleImport}
                  disabled={parsedLeads.length === 0 || importing}
                >
                  {importing ? "Importing..." : `Import ${parsedLeads.length} Leads`}
                </Button>
                <Button variant="outline" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-green-600">
                <CheckCircle className="h-8 w-8" />
                <div>
                  <p className="font-medium">Import Complete</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {result.imported} imported, {result.skipped} skipped (duplicates)
                  </p>
                </div>
              </div>

              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertDescription>
                    <p className="font-medium mb-2">Some errors occurred:</p>
                    <ul className="list-disc list-inside text-sm">
                      {result.errors.map((error, i) => (
                        <li key={i}>{error}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleDone}>View Leads</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">CSV Format Guide</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Your CSV should have headers in the first row. Supported columns:
          </p>
          <ul className="text-sm space-y-1 text-gray-600 dark:text-gray-400">
            <li>
              <strong>Business Name</strong> (required) - Also accepts: company,
              company name, name
            </li>
            <li>
              <strong>Email</strong> (required) - Also accepts: email address
            </li>
            <li>
              <strong>Contact Name</strong> (optional) - Also accepts: contact
            </li>
            <li>
              <strong>Phone</strong> (optional) - Also accepts: telephone, phone
              number
            </li>
            <li>
              <strong>Address</strong> (optional)
            </li>
            <li>
              <strong>Industry</strong> (optional) - Also accepts: sector
            </li>
          </ul>
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
            <p className="text-sm font-mono">
              Business Name,Email,Contact Name,Phone,Industry
              <br />
              The Local Cafe,info@localcafe.co.uk,John Smith,029 1234 5678,Cafe
              <br />
              Cardiff Plumbers,contact@cardiffplumb.co.uk,Mike Jones,,Contractor
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
