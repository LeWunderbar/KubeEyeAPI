const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const https = require('https');

dotenv.config();

const app = express();
const port = 3000;

const kubeApiUrl = process.env.KUBE_API_URL;
const token = process.env.KUBE_TOKEN;

const getHeaders = () => {
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
};

app.get('/:namespace/:appname', async (req, res) => {
    try {
        const { namespace, appname } = req.params;
        const labelSelector = `app=${appname},app.kubernetes.io/name=${appname}`;

        const url = `${kubeApiUrl}/api/v1/namespaces/${namespace}/pods?labelSelector=${labelSelector}`;

        const response = await axios.get(url, {
            headers: getHeaders(),
            httpsAgent: new https.Agent({ rejectUnauthorized: false })
        });

        if (response.data.items.length === 0) {
            return res.status(504).json({ status: "down" });
        }

        const podNames = response.data.items.map(pod => pod.metadata.name);
        
        return res.status(200).json({ status: "up", pods: podNames });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error", message: error.message });
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
