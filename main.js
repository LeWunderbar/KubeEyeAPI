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
        
        const url1 = `${kubeApiUrl}/api/v1/namespaces/${namespace}/pods?labelSelector=app=${appname}`;
        const url2 = `${kubeApiUrl}/api/v1/namespaces/${namespace}/pods?labelSelector=app.kubernetes.io/name=${appname}`;

        const [response1, response2] = await Promise.all([
            axios.get(url1, { headers: getHeaders(), httpsAgent: new https.Agent({ rejectUnauthorized: false }) }),
            axios.get(url2, { headers: getHeaders(), httpsAgent: new https.Agent({ rejectUnauthorized: false }) })
        ]);

        const allPods = [
            ...response1.data.items,
            ...response2.data.items
        ];
        const uniquePods = [...new Set(allPods.map(pod => pod.metadata.name))];

        if (uniquePods.length === 0) {
            return res.status(504).json({ status: "down" });
        }

        return res.status(200).json({ status: "up", pods: uniquePods });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ status: "error", message: error.message });
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
