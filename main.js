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
        const url = `${kubeApiUrl}/apis/apps/v1/namespaces/${namespace}/deployments/${appname}`;
        
        const response = await axios.get(url, { headers: getHeaders(), httpsAgent: new https.Agent({ rejectUnauthorized: false }) });
        const deployment = response.data;
        
        const availableCondition = deployment.status.conditions.find(c => c.type === "Available");
        const readyReplicas = deployment.status.readyReplicas || 0;
        const expectedReplicas = deployment.spec.replicas || 0;
        
        if (availableCondition?.status === "True" && readyReplicas === expectedReplicas) {
            return res.status(200).json({ status: "up" });
        } else {
            return res.status(504).json({ status: "down" });
        }
    } catch (error) {
        console.error("Error fetching deployment status:", error);
        return res.status(500).json({ status: "error" });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
