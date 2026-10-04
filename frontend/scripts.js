// ============================================================
// API CONFIGURATION
// ============================================================

const API_URL = "https://csv-insight-platform.onrender.com";


// ============================================================
// DOM ELEMENTS
// ============================================================

const csvFileInput =
    document.getElementById("csvFile");

const uploadButton =
    document.getElementById("uploadButton");

const uploadStatus =
    document.getElementById("uploadStatus");

const rowCount =
    document.getElementById("rowCount");

const columnCount =
    document.getElementById("columnCount");

const missingCount =
    document.getElementById("missingCount");

const qualityScore =
    document.getElementById("qualityScore");

const datasetInfo =
    document.getElementById("datasetInfo");

const statistics =
    document.getElementById("statistics");

const categoricalAnalysis =
    document.getElementById("categoricalAnalysis");

const qualityReport =
    document.getElementById("qualityReport");


// ============================================================
// UPLOAD CSV
// ============================================================

uploadButton.addEventListener(
    "click",
    async () => {

        const file =
            csvFileInput.files[0];


        // ----------------------------------------------------
        // Check file
        // ----------------------------------------------------

        if (!file) {

            uploadStatus.textContent =
                "Please select a CSV file first.";

            return;
        }


        // ----------------------------------------------------
        // Check extension
        // ----------------------------------------------------

        if (
            !file.name
                .toLowerCase()
                .endsWith(".csv")
        ) {

            uploadStatus.textContent =
                "Please select a CSV file.";

            return;
        }


        // ----------------------------------------------------
        // Disable button
        // ----------------------------------------------------

        uploadButton.disabled = true;

        uploadButton.textContent =
            "Uploading...";

        uploadStatus.textContent =
            "Uploading and analyzing your CSV...";


        try {

            // ------------------------------------------------
            // Create FormData
            // ------------------------------------------------

            const formData =
                new FormData();

            formData.append(
                "file",
                file
            );


            // ------------------------------------------------
            // Send CSV to FastAPI
            // ------------------------------------------------

            const response =
                await fetch(
                    `${API_URL}/upload`,
                    {
                        method: "POST",
                        body: formData
                    }
                );


            // ------------------------------------------------
            // Read response
            // ------------------------------------------------

            const data =
                await response.json();


            // ------------------------------------------------
            // Check API error
            // ------------------------------------------------

            if (!response.ok) {

                throw new Error(
                    data.detail ||
                    "Upload failed"
                );
            }


            // ------------------------------------------------
            // Get file ID
            // ------------------------------------------------

            const fileId =
                data.file_id;


            // ------------------------------------------------
            // Show successful upload
            // ------------------------------------------------

            uploadStatus.textContent =
                `Uploaded successfully: ${data.filename}`;


            // ------------------------------------------------
            // Load dashboard
            // ------------------------------------------------

            await loadDashboard(fileId);


        } catch (error) {

            console.error(
                "Upload error:",
                error
            );


            uploadStatus.textContent =
                `Error: ${error.message}`;


        } finally {

            uploadButton.disabled = false;

            uploadButton.textContent =
                "Upload & Analyze";
        }
    }
);


// ============================================================
// LOAD COMPLETE DASHBOARD
// ============================================================

async function loadDashboard(fileId) {

    try {

        // ----------------------------------------------------
        // Get summary
        // ----------------------------------------------------

        const summary =
            await fetchAPI(
                `/summary/${fileId}`
            );


        // ----------------------------------------------------
        // Get quality report
        // ----------------------------------------------------

        const qualityData =
            await fetchAPI(
                `/quality/report/${fileId}`
            );


        // ----------------------------------------------------
        // Update basic dashboard
        // ----------------------------------------------------

        updateSummary(
            summary,
            qualityData
        );

        updateDatasetInfo(
            summary
        );

        updateQualityReport(
            qualityData
        );


        // ----------------------------------------------------
        // Numeric statistics
        // ----------------------------------------------------

        try {

            const statisticsData =
                await fetchAPI(
                    `/analytics/statistics/${fileId}`
                );

            updateStatistics(
                statisticsData
            );

        } catch (error) {

            statistics.innerHTML = `
                <p>
                    No numeric statistics available.
                </p>
            `;
        }


        // ----------------------------------------------------
        // Categorical analysis
        // ----------------------------------------------------

        try {

            const categoricalData =
                await fetchAPI(
                    `/analytics/categorical/${fileId}`
                );

            updateCategoricalAnalysis(
                categoricalData
            );

        } catch (error) {

            categoricalAnalysis.innerHTML = `
                <p>
                    No categorical data available.
                </p>
            `;
        }


        // ----------------------------------------------------
        // Scroll to dashboard
        // ----------------------------------------------------

        document
            .getElementById("dashboard")
            .scrollIntoView({
                behavior: "smooth"
            });


    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );


        uploadStatus.textContent =
            `Dashboard error: ${error.message}`;
    }
}


// ============================================================
// GENERIC API FUNCTION
// ============================================================

async function fetchAPI(endpoint) {

    const response =
        await fetch(
            `${API_URL}${endpoint}`
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            data.detail ||
            "API request failed"
        );
    }


    return data;
}


// ============================================================
// UPDATE SUMMARY CARDS
// ============================================================

function updateSummary(
    summary,
    quality
) {

    rowCount.textContent =
        summary.rows;


    columnCount.textContent =
        summary.columns;


    missingCount.textContent =
        quality.total_missing_values;


    qualityScore.textContent =
        `${quality.data_quality_score}/100`;
}


// ============================================================
// UPDATE DATASET INFORMATION
// ============================================================

function updateDatasetInfo(summary) {

    datasetInfo.innerHTML = `

        <div class="file-id">

            <strong>
                File ID:
            </strong>

            <br>

            ${summary.file_id}

        </div>


        <p>
            <strong>
                Rows:
            </strong>

            ${summary.rows}
        </p>


        <p>
            <strong>
                Columns:
            </strong>

            ${summary.columns}
        </p>


        <p>
            <strong>
                Column Names:
            </strong>

            ${summary.column_names.join(", ")}
        </p>


        <p>
            <strong>
                Numeric Columns:
            </strong>

            ${
                summary.numeric_columns.join(", ")
                || "None"
            }
        </p>


        <p>
            <strong>
                Categorical Columns:
            </strong>

            ${
                summary.categorical_columns.join(", ")
                || "None"
            }
        </p>


        <p>
            <strong>
                Boolean Columns:
            </strong>

            ${
                summary.boolean_columns.join(", ")
                || "None"
            }
        </p>


        <p>
            <strong>
                Datetime Columns:
            </strong>

            ${
                summary.datetime_columns.join(", ")
                || "None"
            }
        </p>
    `;
}


// ============================================================
// UPDATE NUMERIC STATISTICS
// ============================================================

function updateStatistics(data) {

    const stats =
        data.numeric_statistics;


    const columns =
        Object.keys(stats);


    if (columns.length === 0) {

        statistics.innerHTML = `
            <p>
                No numeric statistics available.
            </p>
        `;

        return;
    }


    let html = `

        <table>

            <thead>

                <tr>

                    <th>
                        Statistic
                    </th>
    `;


    columns.forEach(
        column => {

            html += `

                <th>
                    ${column}
                </th>

            `;
        }
    );


    html += `

                </tr>

            </thead>

            <tbody>
    `;


    const statisticNames = [

        "count",

        "mean",

        "std",

        "min",

        "25%",

        "50%",

        "75%",

        "max"

    ];


    statisticNames.forEach(
        statName => {

            html += `

                <tr>

                    <td>
                        <strong>
                            ${statName}
                        </strong>
                    </td>
            `;


            columns.forEach(
                column => {

                    let value =
                        stats[column][statName];


                    if (
                        value !== undefined &&
                        value !== null &&
                        !isNaN(value)
                    ) {

                        value =
                            Number(value)
                                .toFixed(2);

                    } else {

                        value = "-";
                    }


                    html += `

                        <td>
                            ${value}
                        </td>

                    `;
                }
            );


            html += `

                </tr>

            `;
        }
    );


    html += `

            </tbody>

        </table>
    `;


    statistics.innerHTML =
        html;
}


// ============================================================
// UPDATE CATEGORICAL ANALYSIS
// ============================================================

function updateCategoricalAnalysis(data) {

    const analysis =
        data.categorical_analysis;


    const columns =
        Object.keys(analysis);


    if (columns.length === 0) {

        categoricalAnalysis.innerHTML = `
            <p>
                No categorical data available.
            </p>
        `;

        return;
    }


    let html = "";


    columns.forEach(
        column => {

            html += `

                <div class="category-item">

                    <h4>
                        ${column}
                    </h4>

                    <ul>
            `;


            const values =
                analysis[column];


            Object.entries(values).forEach(
                ([value, count]) => {

                    html += `

                        <li>
                            ${value}: ${count}
                        </li>

                    `;
                }
            );


            html += `

                    </ul>

                </div>

            `;
        }
    );


    categoricalAnalysis.innerHTML =
        html;
}


// ============================================================
// UPDATE QUALITY REPORT
// ============================================================

function updateQualityReport(data) {

    let qualityClass =
        "quality-good";


    if (
        data.quality_status ===
        "Needs Improvement"
    ) {

        qualityClass =
            "quality-warning";
    }


    if (
        data.quality_status ===
        "Poor"
    ) {

        qualityClass =
            "quality-poor";
    }


    let html = `

        <div class="${qualityClass}">

            <h4>
                Quality Status:
                ${data.quality_status}
            </h4>


            <p>
                <strong>
                    Quality Score:
                </strong>

                ${data.data_quality_score}/100
            </p>


            <p>
                <strong>
                    Total Missing Values:
                </strong>

                ${data.total_missing_values}
            </p>


            <p>
                <strong>
                    Duplicate Rows:
                </strong>

                ${data.duplicate_rows}
            </p>


            <p>
                <strong>
                    Invalid Dates:
                </strong>

                ${data.invalid_dates}
            </p>

        </div>


        <br>


        <h4>
            Missing Values
        </h4>
    `;


    // ========================================================
    // MISSING VALUES
    // ========================================================

    if (
        Object.keys(
            data.missing_values
        ).length === 0
    ) {

        html += `

            <p>
                No missing values detected.
            </p>

        `;

    } else {

        html += `
            <ul>
        `;


        Object.entries(
            data.missing_values
        ).forEach(
            ([column, count]) => {

                html += `

                    <li>
                        ${column}: ${count}
                    </li>

                `;
            }
        );


        html += `
            </ul>
        `;
    }


    // ========================================================
    // NEGATIVE VALUES
    // ========================================================

    html += `

        <h4>
            Negative Values
        </h4>

    `;


    if (
        Object.keys(
            data.negative_values
        ).length === 0
    ) {

        html += `

            <p>
                No negative values detected.
            </p>

        `;

    } else {

        html += `
            <ul>
        `;


        Object.entries(
            data.negative_values
        ).forEach(
            ([column, count]) => {

                html += `

                    <li>
                        ${column}: ${count}
                    </li>

                `;
            }
        );


        html += `
            </ul>
        `;
    }


    // ========================================================
    // DATE ANALYSIS
    // ========================================================

    html += `

        <h4>
            Date Analysis
        </h4>

    `;


    if (
        Object.keys(
            data.date_analysis
        ).length === 0
    ) {

        html += `

            <p>
                No date columns detected.
            </p>

        `;

    } else {

        html += `
            <ul>
        `;


        Object.entries(
            data.date_analysis
        ).forEach(
            ([column, info]) => {

                html += `

                    <li>

                        ${column}:

                        ${info.invalid_dates}

                        invalid date(s)

                    </li>

                `;
            }
        );


        html += `
            </ul>
        `;
    }


    qualityReport.innerHTML =
        html;
}