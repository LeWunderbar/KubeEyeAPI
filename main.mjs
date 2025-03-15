import express from 'express';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as k8s from '@kubernetes/client-node'; // ESM import syntax

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// Kubernetes API URL from environment variable
const kubeApiUrl = process.env.KUBE_API_URL;

const app = express();
const port = 3000;

const kc = new k8s.KubeConfig();

// Load the certificates
const clientCert = fs.readFileSync(path.resolve(__dirname, 'certs/client.crt'));
const clientKey = fs.readFileSync(path.resolve(__dirname, './certs/client.key'));
const caCert = fs.readFileSync(path.resolve(__dirname, './certs/ca.crt'));

// Set up Kubernetes config with certificates
kc.loadFromOptions({
    clusters: [
        {
            name: 'kubernetes-cluster',
            server: kubeApiUrl,  // Kubernetes API URL
            ca: caCert,          // CA certificate
        },
    ],
    users: [
        {
            name: 'client-user',
            clientCertificate: clientCert,  // Client certificate
            clientKey: clientKey,           // Client private key
        },
    ],
    contexts: [
        {
            name: 'default-context',
            cluster: 'kubernetes-cluster',
            user: 'client-user',
        },
    ],
    currentContext: 'default-context',
});

// Create Kubernetes API client
const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

// Function to check pod status based on label selector
const checkPodsStatus = async (namespace, appname) => {
    try {
        console.log(await k8sApi.listPodForAllNamespaces())

        const res1 = await k8sApi.listNamespacedPod("traefik", false, undefined, undefined, undefined, `app=${appname}`);
        const res2 = await k8sApi.listNamespacedPod("traefik", false, undefined, undefined, undefined, `app.kubernetes.io/name=${appname}`);

        // Combine and remove duplicates
        const allPods = [
            ...res1.body.items,
            ...res2.body.items
        ];
        const uniquePods = [...new Set(allPods.map(pod => pod.metadata.name))];

        return uniquePods;
    } catch (error) {
        console.error('Error fetching pods:', error);
        throw error;
    }
};

// API endpoint to get pod status for a specific namespace and appname
app.get('/:namespace/:appname', async (req, res) => {
    try {
        const { namespace, appname } = req.params;

        // Validate namespace and appname
        if (!namespace || !appname) {
            return res.status(400).json({ status: "error", message: "Namespace or appname is missing" });
        }

        const uniquePods = await checkPodsStatus(namespace, appname);

        if (uniquePods.length === 0) {
            return res.status(504).json({ status: "down" });
        }

        return res.status(200).json({ status: "up" });

    } catch (error) {
        console.error('Error in request:', error);
        return res.status(500).json({ status: "error", message: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
